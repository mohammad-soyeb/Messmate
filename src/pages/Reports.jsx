import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  BarChart3,
  Printer,
  Search,
  Users,
  Utensils,
} from "lucide-react";
import toast from "react-hot-toast";

import { getWorkspaceData } from "../services/dataService";
import "../styles/reports.css";

const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const getMealTotal = (meal) => {
  /*
   * নতুন meal structure:
   * breakfast + lunch + dinner
   */
  if (
    meal.breakfast !== undefined ||
    meal.lunch !== undefined ||
    meal.dinner !== undefined
  ) {
    return (
      Number(meal.breakfast || 0) +
      Number(meal.lunch || 0) +
      Number(meal.dinner || 0)
    );
  }

  /*
   * পুরোনো quantity structure support
   */
  return Number(meal.quantity || 0);
};

const getBazaarEntryTotal = (entry) => {
  /*
   * নতুন structure
   */
  if (entry.grandTotal !== undefined) {
    return Number(entry.grandTotal || 0);
  }

  /*
   * পুরোনো structure
   */
  return Number(entry.price || 0);
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const formatMeal = (amount) => {
  const number = Number(amount) || 0;

  return Number.isInteger(number)
    ? String(number)
    : number
        .toFixed(2)
        .replace(/0+$/, "")
        .replace(/\.$/, "");
};

const formatMonthName = (monthValue) => {
  if (!monthValue) {
    return "";
  }

  const [year, month] = monthValue.split("-");

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(
      Number(year),
      Number(month) - 1,
      1
    )
  );
};

const Reports = () => {
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [searchText, setSearchText] =
    useState("");

  const [sortOption, setSortOption] =
    useState("meal-high");

  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] =
    useState([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const data = await getWorkspaceData();

        if (active) {
          setMembers(data.members);
          setMeals(data.meals);
          setBazaarEntries(
            data.bazaarEntries
          );
        }
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to load report data."
        );
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const monthlyMeals = useMemo(() => {
    return meals.filter((meal) =>
      meal.date?.startsWith(selectedMonth)
    );
  }, [meals, selectedMonth]);

  const monthlyBazaarEntries = useMemo(() => {
    return bazaarEntries.filter((entry) =>
      entry.date?.startsWith(selectedMonth)
    );
  }, [bazaarEntries, selectedMonth]);

  const totalMeals = useMemo(() => {
    return monthlyMeals.reduce(
      (total, meal) =>
        total + getMealTotal(meal),
      0
    );
  }, [monthlyMeals]);

  const totalBazaar = useMemo(() => {
    return monthlyBazaarEntries.reduce(
      (total, entry) =>
        total + getBazaarEntryTotal(entry),
      0
    );
  }, [monthlyBazaarEntries]);

  const mealRate =
    totalMeals > 0
      ? totalBazaar / totalMeals
      : 0;

  const memberReports = useMemo(() => {
    return members.map((member) => {
      const memberMeals = monthlyMeals
        .filter((meal) => {
          const sameMemberId =
            meal.memberId &&
            meal.memberId === member.id;

          const sameMemberName =
            !meal.memberId &&
            normalizeText(
              meal.memberName || meal.member
            ) ===
              normalizeText(member.name);

          return sameMemberId || sameMemberName;
        })
        .reduce(
          (total, meal) =>
            total + getMealTotal(meal),
          0
        );

      const memberBazaar = monthlyBazaarEntries
        .filter((entry) => {
          const sameMemberId =
            entry.memberId &&
            entry.memberId === member.id;

          const sameMemberName =
            !entry.memberId &&
            normalizeText(
              entry.memberName || entry.member
            ) ===
              normalizeText(member.name);

          return sameMemberId || sameMemberName;
        })
        .reduce(
          (total, entry) =>
            total +
            getBazaarEntryTotal(entry),
          0
        );

      const mealCost =
        memberMeals * mealRate;

      /*
       * Member বাজারে যে টাকা দিয়েছে,
       * সেখান থেকে তার meal cost বাদ।
       *
       * Positive = টাকা পাবে
       * Negative = টাকা দিতে হবে
       */
      const balance =
        memberBazaar - mealCost;

      return {
        id: member.id,
        name: member.name,
        email: member.email || "",
        role: member.role || "member",
        totalMeal: memberMeals,
        mealCost,
        bazaarPaid: memberBazaar,
        balance,
      };
    });
  }, [
    members,
    monthlyMeals,
    monthlyBazaarEntries,
    mealRate,
  ]);

  const filteredReports = useMemo(() => {
    const normalizedSearch =
      normalizeText(searchText);

    const filtered = memberReports.filter(
      (member) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          normalizeText(member.name).includes(
            normalizedSearch
          ) ||
          normalizeText(member.email).includes(
            normalizedSearch
          )
        );
      }
    );

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "meal-low":
          return a.totalMeal - b.totalMeal;

        case "name-az":
          return a.name.localeCompare(b.name);

        case "name-za":
          return b.name.localeCompare(a.name);

        case "cost-high":
          return b.mealCost - a.mealCost;

        case "balance-high":
          return b.balance - a.balance;

        case "meal-high":
        default:
          return b.totalMeal - a.totalMeal;
      }
    });
  }, [
    memberReports,
    searchText,
    sortOption,
  ]);

  const activeMembers = useMemo(() => {
    return memberReports.filter(
      (member) => member.totalMeal > 0
    ).length;
  }, [memberReports]);

  const averageMeal =
    activeMembers > 0
      ? totalMeals / activeMembers
      : 0;

  const highestMeal = useMemo(() => {
    if (memberReports.length === 0) {
      return 0;
    }

    return Math.max(
      ...memberReports.map(
        (member) => member.totalMeal
      )
    );
  }, [memberReports]);

  const lowestMeal = useMemo(() => {
    const membersWithMeals =
      memberReports.filter(
        (member) => member.totalMeal > 0
      );

    if (membersWithMeals.length === 0) {
      return 0;
    }

    return Math.min(
      ...membersWithMeals.map(
        (member) => member.totalMeal
      )
    );
  }, [memberReports]);

  const totalBalance = useMemo(() => {
    return memberReports.reduce(
      (total, member) =>
        total + member.balance,
      0
    );
  }, [memberReports]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container reports-page">
      <div className="reports-page-header">
        <div>
          <div className="reports-heading-icon">
            <BarChart3 size={25} />
          </div>

          <div>
            <h1>Monthly Report</h1>

            <p>
              Complete meal and bazaar summary
              for {formatMonthName(selectedMonth)}.
            </p>
          </div>
        </div>

        <div className="reports-header-actions">
          <button
            type="button"
            className="report-print-button"
            onClick={handlePrint}
          >
            <Printer size={17} />
            Print Report
          </button>
        </div>
      </div>

      <div className="reports-filter-card">
        <div className="reports-month-field">
          <label htmlFor="reportMonth">
            <CalendarDays size={16} />
            Report month
          </label>

          <input
            id="reportMonth"
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(
                event.target.value
              )
            }
          />
        </div>

        <div className="reports-search-field">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search member..."
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
          />
        </div>

        <div className="reports-sort-field">
          <label htmlFor="reportSort">
            Sort by
          </label>

          <select
            id="reportSort"
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value)
            }
          >
            <option value="meal-high">
              Meal: High to Low
            </option>

            <option value="meal-low">
              Meal: Low to High
            </option>

            <option value="cost-high">
              Meal Cost: High to Low
            </option>

            <option value="balance-high">
              Balance: High to Low
            </option>

            <option value="name-az">
              Name: A to Z
            </option>

            <option value="name-za">
              Name: Z to A
            </option>
          </select>
        </div>
      </div>

      <div className="reports-summary-grid">
        <div className="report-summary-card">
          <div className="report-card-icon members">
            <Users size={22} />
          </div>

          <div>
            <span>Total Members</span>
            <strong>{members.length}</strong>
            <small>
              {activeMembers} members have meals
            </small>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-card-icon meals">
            <Utensils size={22} />
          </div>

          <div>
            <span>Total Meals</span>

            <strong>
              {formatMeal(totalMeals)}
            </strong>

            <small>
              Monthly meal amount
            </small>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-card-icon bazaar">
            ৳
          </div>

          <div>
            <span>Total Bazaar</span>

            <strong>
              ৳ {formatMoney(totalBazaar)}
            </strong>

            <small>
              Monthly bazaar total
            </small>
          </div>
        </div>

        <div className="report-summary-card featured">
          <div className="report-card-icon rate">
            ৳
          </div>

          <div>
            <span>Meal Rate</span>

            <strong>
              ৳ {formatMoney(mealRate)}
            </strong>

            <small>
              Bazaar ÷ Total Meal
            </small>
          </div>
        </div>
      </div>

      <section className="reports-table-card">
        <div className="reports-table-header">
          <div>
            <h2>Member-wise Summary</h2>

            <p>
              Bazaar paid minus meal cost
              determines the balance.
            </p>
          </div>

          <span>
            {filteredReports.length}{" "}
            {filteredReports.length === 1
              ? "member"
              : "members"}
          </span>
        </div>

        <div className="reports-table-wrapper">
          <table className="monthly-report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Total Meal</th>
                <th>Meal Rate</th>
                <th>Meal Cost</th>
                <th>Bazaar Paid</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="reports-empty-state"
                  >
                    No report data found for
                    this month.
                  </td>
                </tr>
              ) : (
                filteredReports.map(
                  (member, index) => (
                    <tr key={member.id}>
                      <td>{index + 1}</td>

                      <td>
                        <div className="report-member-info">
                          <div className="report-member-avatar">
                            {member.name
                              ?.charAt(0)
                              .toUpperCase() ||
                              "M"}
                          </div>

                          <div>
                            <strong>
                              {member.name}
                            </strong>

                            <span>
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="report-meal-badge">
                          {formatMeal(
                            member.totalMeal
                          )}
                        </span>
                      </td>

                      <td>
                        ৳ {formatMoney(mealRate)}
                      </td>

                      <td>
                        <strong>
                          ৳{" "}
                          {formatMoney(
                            member.mealCost
                          )}
                        </strong>
                      </td>

                      <td>
                        ৳{" "}
                        {formatMoney(
                          member.bazaarPaid
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            member.balance > 0
                              ? "report-balance positive"
                              : member.balance < 0
                                ? "report-balance negative"
                                : "report-balance neutral"
                          }
                        >
                          {member.balance > 0
                            ? "+"
                            : member.balance < 0
                              ? "-"
                              : ""}
                          ৳{" "}
                          {formatMoney(
                            Math.abs(
                              member.balance
                            )
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="reports-bottom-summary">
        <div>
          <span>Active Members</span>
          <strong>{activeMembers}</strong>
        </div>

        <div>
          <span>Average Meal</span>

          <strong>
            {formatMeal(averageMeal)}
          </strong>
        </div>

        <div>
          <span>Highest Meal</span>

          <strong>
            {formatMeal(highestMeal)}
          </strong>
        </div>

        <div>
          <span>Lowest Meal</span>

          <strong>
            {formatMeal(lowestMeal)}
          </strong>
        </div>

        <div>
          <span>Balance Difference</span>

          <strong
            className={
              Math.abs(totalBalance) < 0.01
                ? "balanced"
                : "difference"
            }
          >
            ৳ {formatMoney(totalBalance)}
          </strong>
        </div>
      </div>

      <div className="report-print-footer">
        <p>
          MessMate Monthly Report —{" "}
          {formatMonthName(selectedMonth)}
        </p>
      </div>
    </div>
  );
};

export default Reports;
