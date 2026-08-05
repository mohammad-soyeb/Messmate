import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ShoppingBasket,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { getWorkspaceData } from "../services/dataService";
import "../styles/reports.css";

const getCurrentMonth = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
};

const normalizeText = (value = "") =>
  String(value).trim().toLowerCase();

const getDisplayName = (member) => {
  return member?.name?.trim() || "Member";
};

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

const isPersonalBazaarPayment = (entry) =>
  !entry.paymentSource ||
  entry.paymentSource === "personal";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatSignedMoney = (value) => {
  const amount = Number(value) || 0;

  return `${amount > 0.005 ? "+" : amount < -0.005 ? "−" : ""}৳${formatMoney(
    Math.abs(amount)
  )}`;
};

const formatMeal = (value) => {
  const amount = Number(value) || 0;

  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
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
    new Date(Number(year), Number(month) - 1, 1)
  );
};

const Reports = () => {
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);

  const [
    bazaarEntries,
    setBazaarEntries,
  ] = useState([]);

  const [
    financialEntries,
    setFinancialEntries,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      try {
        setLoading(true);

        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        setMembers(data.members || []);
        setMeals(data.meals || []);
        setBazaarEntries(
          data.bazaarEntries || []
        );
        setFinancialEntries(
          data.financialEntries || []
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to load report."
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

  const monthlyMeals = useMemo(() => {
    return meals.filter((meal) =>
      meal.date?.startsWith(selectedMonth)
    );
  }, [meals, selectedMonth]);

  const monthlyBazaar = useMemo(() => {
    return bazaarEntries.filter((entry) =>
      entry.date?.startsWith(selectedMonth)
    );
  }, [bazaarEntries, selectedMonth]);

  const monthlyFinancialEntries = useMemo(
    () =>
      financialEntries.filter(
        (entry) => entry.month === selectedMonth
      ),
    [financialEntries, selectedMonth]
  );

  const reportMembers = useMemo(() => {
    const memberMap = new Map();

    members.forEach((member) => {
      memberMap.set(member.id, {
        id: member.id,
        name: member.name || "Member",
        displayName: getDisplayName(member),
        role: member.role || "member",
        active: member.isActive !== false,
      });
    });

    [
      ...monthlyMeals,
      ...monthlyBazaar,
      ...monthlyFinancialEntries,
    ].forEach(
      (record) => {
        const fullName =
          record.memberFullName ||
          record.memberName ||
          record.member ||
          "";

        const displayName =
          fullName ||
          record.memberName ||
          "Former member";

        const memberId =
          record.memberId ||
          `name-${normalizeText(
            fullName || displayName
          )}`;

        if (!memberId || memberId === "name-") {
          return;
        }

        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            id: memberId,
            name: fullName || displayName,
            displayName,
            role: "former",
            active: false,
          });
        }
      }
    );

    return Array.from(memberMap.values()).sort(
      (a, b) =>
        a.displayName.localeCompare(
          b.displayName
        )
    );
  }, [
    members,
    monthlyMeals,
    monthlyBazaar,
    monthlyFinancialEntries,
  ]);

  const getRecordMemberId = (record) => {
    return (
      record.memberId ||
      `name-${normalizeText(
        record.memberFullName ||
          record.memberName ||
          record.member
      )}`
    );
  };

  const totalMeals = useMemo(() => {
    return monthlyMeals.reduce(
      (total, meal) =>
        total + getMealTotal(meal),
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
    totalMeals > 0
      ? totalBazaar / totalMeals
      : 0;

  const memberReports = useMemo(() => {
    return reportMembers
      .map((member) => {
        const memberMeals = monthlyMeals
          .filter(
            (meal) =>
              getRecordMemberId(meal) ===
              member.id
          )
          .reduce(
            (total, meal) =>
              total + getMealTotal(meal),
            0
          );

        const bazaarPaid = monthlyBazaar
          .filter(
            (entry) =>
              getRecordMemberId(entry) ===
                member.id &&
              isPersonalBazaarPayment(entry)
          )
          .reduce(
            (total, entry) =>
              total +
              getBazaarTotal(entry),
            0
          );

        const mealCost =
          memberMeals * mealRate;

        const memberFinancialEntries =
          monthlyFinancialEntries.filter(
            (entry) =>
              entry.memberId === member.id
          );

        const openingBalance =
          memberFinancialEntries
            .filter(
              (entry) =>
                entry.type ===
                "opening_balance"
            )
            .reduce(
              (total, entry) =>
                total + Number(entry.amount || 0),
              0
            );

        const deposits =
          memberFinancialEntries
            .filter(
              (entry) =>
                entry.type === "deposit"
            )
            .reduce(
              (total, entry) =>
                total + Number(entry.amount || 0),
              0
            );

        const balance =
          openingBalance +
          deposits +
          bazaarPaid -
          mealCost;

        return {
          ...member,
          totalMeal: memberMeals,
          mealCost,
          openingBalance,
          deposits,
          bazaarPaid,
          balance,
        };
      })
      .sort((a, b) => {
        if (b.totalMeal !== a.totalMeal) {
          return (
            b.totalMeal - a.totalMeal
          );
        }

        return a.displayName.localeCompare(
          b.displayName
        );
      });
  }, [
    reportMembers,
    monthlyMeals,
    monthlyBazaar,
    monthlyFinancialEntries,
    mealRate,
  ]);

  const reportTotals = useMemo(() => {
    return memberReports.reduce(
      (totals, member) => ({
        opening:
          totals.opening + member.openingBalance,
        deposits:
          totals.deposits + member.deposits,
        balance: totals.balance + member.balance,
      }),
      {
        opening: 0,
        deposits: 0,
        balance: 0,
      }
    );
  }, [memberReports]);

  const activeMembers = useMemo(() => {
    return memberReports.filter(
      (member) => member.totalMeal > 0
    ).length;
  }, [memberReports]);

  if (loading) {
    return (
      <div className="reports-loading">
        Loading monthly report...
      </div>
    );
  }

  return (
    <div className="page-container reports-page">
      <header className="reports-page-header">
        <div>
          <div className="reports-heading-icon">
            <BarChart3 size={23} />
          </div>

          <div>
            <h1>Monthly Report</h1>

            <p>
              {formatMonthName(
                selectedMonth
              )}
            </p>
          </div>
        </div>

        <label className="reports-month-field">
          <CalendarDays size={16} />

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(
                event.target.value
              )
            }
          />
        </label>
      </header>

      <section className="reports-summary-grid">
        <article className="report-summary-card">
          <div className="report-card-icon members">
            <Users size={20} />
          </div>

          <div>
            <span>Members</span>

            <strong>
              {reportMembers.length}
            </strong>

            <small>
              {activeMembers} with meals
            </small>
          </div>
        </article>

        <article className="report-summary-card">
          <div className="report-card-icon meals">
            <UtensilsCrossed size={20} />
          </div>

          <div>
            <span>Total Meals</span>

            <strong>
              {formatMeal(totalMeals)}
            </strong>
          </div>
        </article>

        <article className="report-summary-card">
          <div className="report-card-icon bazaar">
            <ShoppingBasket size={20} />
          </div>

          <div>
            <span>Total Bazaar</span>

            <strong>
              ৳{formatMoney(totalBazaar)}
            </strong>
          </div>
        </article>

        <article className="report-summary-card featured">
          <div className="report-card-icon rate">
            <CircleDollarSign size={20} />
          </div>

          <div>
            <span>Meal Rate</span>

            <strong>
              ৳{formatMoney(mealRate)}
            </strong>
          </div>
        </article>
      </section>

      <section className="reports-table-card">
        <header className="reports-table-header">
          <div>
            <h2>Member-wise Summary</h2>
          </div>

          <span>
            {memberReports.length} members
          </span>
        </header>

        <div className="reports-table-wrapper">
          <table className="monthly-report-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Opening</th>
                <th>Deposit</th>
                <th>Meal</th>
                <th>Meal Cost</th>
                <th>Bazaar</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {memberReports.length === 0 ? (
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
                memberReports.map(
                  (member) => {
                    const willReceive =
                      member.balance > 0.005;

                    const willPay =
                      member.balance < -0.005;

                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="report-member-info">
                            <div
                              className="report-member-avatar"
                              title={
                                member.name
                              }
                            >
                              {member.displayName
                                ?.charAt(0)
                                .toUpperCase() ||
                                "M"}
                            </div>

                            <div>
                              <strong
                                title={
                                  member.name
                                }
                              >
                                {
                                  member.displayName
                                }
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
                          {formatSignedMoney(
                            member.openingBalance
                          )}
                        </td>

                        <td>
                          ৳
                          {formatMoney(
                            member.deposits
                          )}
                        </td>

                        <td>
                          <span className="report-meal-badge">
                            {formatMeal(
                              member.totalMeal
                            )}
                          </span>
                        </td>

                        <td>
                          ৳
                          {formatMoney(
                            member.mealCost
                          )}
                        </td>

                        <td>
                          ৳
                          {formatMoney(
                            member.bazaarPaid
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              willReceive
                                ? "report-balance positive"
                                : willPay
                                  ? "report-balance negative"
                                  : "report-balance neutral"
                            }
                          >
                            {willReceive
                              ? "+"
                              : ""}

                            {willPay
                              ? "−"
                              : ""}

                            ৳
                            {formatMoney(
                              Math.abs(
                                member.balance
                              )
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>

            {memberReports.length > 0 && (
              <tfoot>
                <tr>
                  <th>Total</th>

                  <th>
                    {formatSignedMoney(
                      reportTotals.opening
                    )}
                  </th>

                  <th>
                    ৳
                    {formatMoney(
                      reportTotals.deposits
                    )}
                  </th>

                  <th>
                    {formatMeal(totalMeals)}
                  </th>

                  <th>
                    ৳{formatMoney(totalBazaar)}
                  </th>

                  <th>
                    ৳{formatMoney(totalBazaar)}
                  </th>

                  <th>
                    {formatSignedMoney(
                      reportTotals.balance
                    )}
                  </th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};

export default Reports;
