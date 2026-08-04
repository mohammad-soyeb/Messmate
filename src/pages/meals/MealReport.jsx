import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  PieChart,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import toast from "react-hot-toast";

import { getWorkspaceData } from "../../services/dataService";
import "../../styles/mealReport.css";

const getCurrentMonth = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
};

const normalizeText = (value = "") =>
  String(value).trim().toLowerCase();

const getMealTotal = (meal) => {
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

  return Number(meal.quantity || 0);
};

const getBazaarTotal = (entry) => {
  if (entry.grandTotal !== undefined) {
    return Number(entry.grandTotal || 0);
  }

  return Number(entry.price || 0);
};

const formatMeal = (value) => {
  const amount = Number(value) || 0;

  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatMonthName = (monthValue) => {
  if (!monthValue) return "";

  const [year, month] = monthValue.split("-");

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
};

const getCurrentDate = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const MealReport = () => {
  const [selectedMonth, setSelectedMonth] = useState(
    getCurrentMonth()
  );

  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      try {
        setLoading(true);

        const data = await getWorkspaceData();

        if (!active) return;

        setMembers(data.members || []);
        setMeals(data.meals || []);
        setBazaarEntries(data.bazaarEntries || []);
      } catch (error) {
        toast.error(
          error.message || "Unable to load meal report."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      active = false;
    };
  }, []);

  const reportEndDate = useMemo(() => {
    if (selectedMonth === getCurrentMonth()) {
      return getCurrentDate();
    }

    const [year, month] = selectedMonth
      .split("-")
      .map(Number);

    const lastDay = new Date(year, month, 0).getDate();

    return `${selectedMonth}-${String(lastDay).padStart(
      2,
      "0"
    )}`;
  }, [selectedMonth]);

  const monthlyMeals = useMemo(() => {
    return meals.filter((meal) => {
      return (
        meal.date?.startsWith(selectedMonth) &&
        meal.date <= reportEndDate
      );
    });
  }, [meals, selectedMonth, reportEndDate]);

  const monthlyBazaar = useMemo(() => {
    return bazaarEntries.filter((entry) => {
      return (
        entry.date?.startsWith(selectedMonth) &&
        entry.date <= reportEndDate
      );
    });
  }, [
    bazaarEntries,
    selectedMonth,
    reportEndDate,
  ]);

  /*
   * Active member-এর সঙ্গে historical meal থাকা
   * former member-কেও report-এ রাখা হবে।
   */
  const reportMembers = useMemo(() => {
    const memberMap = new Map();

    members.forEach((member) => {
      memberMap.set(member.id, {
        id: member.id,
        name: member.name || "Member",
        role: member.role || "member",
        active: member.isActive !== false,
      });
    });

    monthlyMeals.forEach((meal) => {
      const memberName =
        meal.memberName || meal.member || "";

      const memberId =
        meal.memberId ||
        `name-${normalizeText(memberName)}`;

      if (!memberId || memberId === "name-") return;

      if (!memberMap.has(memberId)) {
        memberMap.set(memberId, {
          id: memberId,
          name: memberName || "Former member",
          role: "former",
          active: false,
        });
      }
    });

    return Array.from(memberMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [members, monthlyMeals]);

  const getRecordMemberId = (record) => {
    return (
      record.memberId ||
      `name-${normalizeText(
        record.memberName || record.member
      )}`
    );
  };

  const totalMeals = useMemo(() => {
    return monthlyMeals.reduce(
      (total, meal) => total + getMealTotal(meal),
      0
    );
  }, [monthlyMeals]);

  const totalBazaar = useMemo(() => {
    return monthlyBazaar.reduce(
      (total, entry) =>
        total + getBazaarTotal(entry),
      0
    );
  }, [monthlyBazaar]);

  const mealRate =
    totalMeals > 0 ? totalBazaar / totalMeals : 0;

  const memberReports = useMemo(() => {
    return reportMembers
      .map((member) => {
        const memberMeals = monthlyMeals
          .filter(
            (meal) =>
              getRecordMemberId(meal) === member.id
          )
          .reduce(
            (total, meal) =>
              total + getMealTotal(meal),
            0
          );

        const mealShare =
          totalMeals > 0
            ? (memberMeals / totalMeals) * 100
            : 0;

        const estimatedCost = memberMeals * mealRate;

        return {
          ...member,
          totalMeal: memberMeals,
          mealShare,
          estimatedCost,
        };
      })
      .sort((a, b) => {
        if (b.totalMeal !== a.totalMeal) {
          return b.totalMeal - a.totalMeal;
        }

        return a.name.localeCompare(b.name);
      });
  }, [
    reportMembers,
    monthlyMeals,
    totalMeals,
    mealRate,
  ]);

  const membersWithMeals = useMemo(() => {
    return memberReports.filter(
      (member) => member.totalMeal > 0
    ).length;
  }, [memberReports]);

  if (loading) {
    return (
      <div className="meal-report-loading">
        <div className="meal-report-loader" />

        <span>Preparing meal report...</span>
      </div>
    );
  }

  return (
    <div className="member-meal-report-page">
      <header className="member-meal-report-header">
        <div>
          <span className="member-meal-report-eyebrow">
            <PieChart size={14} />
            Monthly overview
          </span>

          <h2>Member-wise Meal Report</h2>

          <p>
            Meal summary up to{" "}
            {selectedMonth === getCurrentMonth()
              ? "today"
              : "the end of the month"}.
          </p>
        </div>

        <label className="member-report-month">
          <CalendarDays size={17} />

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(event.target.value)
            }
          />
        </label>
      </header>

      <section className="member-report-summary">
        <article>
          <div className="member-report-summary-icon members">
            <Users size={18} />
          </div>

          <div>
            <span>Members</span>
            <strong>{reportMembers.length}</strong>
            <small>{membersWithMeals} with meals</small>
          </div>
        </article>

        <article>
          <div className="member-report-summary-icon meals">
            <UtensilsCrossed size={18} />
          </div>

          <div>
            <span>Total Meals</span>
            <strong>{formatMeal(totalMeals)}</strong>
            <small>{formatMonthName(selectedMonth)}</small>
          </div>
        </article>

        <article>
          <div className="member-report-summary-icon rate">
            <CircleDollarSign size={18} />
          </div>

          <div>
            <span>Meal Rate</span>
            <strong>৳{formatMoney(mealRate)}</strong>
            <small>Per meal</small>
          </div>
        </article>
      </section>

      <section className="member-report-table-card">
        <header className="member-report-table-heading">
          <div>
            <h3>Meal Distribution</h3>

            <p>
              Member totals and monthly meal cost.
            </p>
          </div>

          <span>{memberReports.length} members</span>
        </header>

        <div className="member-report-table-wrapper">
          <table className="member-report-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Total Meal</th>
                <th>Meal Share</th>
                <th>Meal Cost</th>
              </tr>
            </thead>

            <tbody>
              {memberReports.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="member-report-empty"
                  >
                    No meal records found for this month.
                  </td>
                </tr>
              ) : (
                memberReports.map((member, index) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-report-person">
                        <div className="member-report-rank">
                          {index + 1}
                        </div>

                        <div className="member-report-avatar">
                          {member.name
                            ?.charAt(0)
                            .toUpperCase() || "M"}
                        </div>

                        <div className="member-report-name">
                          <strong title={member.name}>
                            {member.name}
                          </strong>

                          <span>
                            {member.active
                              ? member.role
                              : "former member"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="member-report-meal">
                        {formatMeal(member.totalMeal)}
                      </span>
                    </td>

                    <td>
                      <div className="member-report-share">
                        <strong>
                          {formatNumber(
                            member.mealShare
                          )}
                          %
                        </strong>

                        <div className="member-share-track">
                          <span
                            style={{
                              width: `${Math.min(
                                member.mealShare,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong className="member-report-cost">
                        ৳
                        {formatMoney(
                          member.estimatedCost
                        )}
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {memberReports.length > 0 && (
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th>{formatMeal(totalMeals)}</th>
                  <th>100%</th>
                  <th>৳{formatMoney(totalBazaar)}</th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};

export default MealReport;