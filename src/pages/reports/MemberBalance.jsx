import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Scale,
  ShoppingBasket,
  Utensils,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { getWorkspaceData } from "../../services/dataService";
import "../../styles/memberBalance.css";

const getCurrentMonth = () =>
  new Date().toISOString().slice(0, 7);

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

const formatMoney = (value) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatMeal = (value) => {
  const amount = Number(value) || 0;

  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
};

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

/*
 * নাম ছোট হলে full name দেখাবে।
 * নাম বড় হলে শেষের নাম বা surname দেখাবে।
 * Mouse রাখলে title-এর মাধ্যমে full name দেখা যাবে।
 */
const getDisplayName = (fullName = "") => {
  const cleanName = String(fullName).trim();

  if (cleanName.length <= 13) {
    return cleanName || "Member";
  }

  const nameParts = cleanName.split(/\s+/);

  return nameParts[nameParts.length - 1] || "Member";
};

const MemberBalance = () => {
  const [selectedMonth, setSelectedMonth] = useState(
    getCurrentMonth()
  );

  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const data = await getWorkspaceData();

        if (!active) return;

        setMembers(data.members || []);
        setMeals(data.meals || []);
        setBazaarEntries(data.bazaarEntries || []);
      } catch (error) {
        toast.error(
          error.message || "Unable to load member balance."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
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

  const monthlyBazaar = useMemo(() => {
    return bazaarEntries.filter((entry) =>
      entry.date?.startsWith(selectedMonth)
    );
  }, [bazaarEntries, selectedMonth]);

  /*
   * Historical meal অথবা bazaar থাকা former member-কেও
   * report-এর মধ্যে রাখা হবে।
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

    [...monthlyMeals, ...monthlyBazaar].forEach(
      (record) => {
        const recordName =
          record.memberName || record.member || "";

        const recordId =
          record.memberId ||
          `name-${normalizeText(recordName)}`;

        if (!recordId || recordId === "name-") return;

        if (!memberMap.has(recordId)) {
          memberMap.set(recordId, {
            id: recordId,
            name: recordName || "Former member",
            role: "former",
            active: false,
          });
        }
      }
    );

    return Array.from(memberMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [members, monthlyMeals, monthlyBazaar]);

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

  const memberBalances = useMemo(() => {
    return reportMembers.map((member) => {
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

      const bazaarPaid = monthlyBazaar
        .filter(
          (entry) =>
            getRecordMemberId(entry) === member.id
        )
        .reduce(
          (total, entry) =>
            total + getBazaarTotal(entry),
          0
        );

      const mealBill = memberMeals * mealRate;
      const balance = bazaarPaid - mealBill;

      return {
        ...member,
        totalMeal: memberMeals,
        bazaarPaid,
        mealBill,
        balance,
      };
    });
  }, [
    reportMembers,
    monthlyMeals,
    monthlyBazaar,
    mealRate,
  ]);

  const totalReceivable = useMemo(() => {
    return memberBalances.reduce(
      (total, member) =>
        member.balance > 0
          ? total + member.balance
          : total,
      0
    );
  }, [memberBalances]);

  const totalPayable = useMemo(() => {
    return memberBalances.reduce(
      (total, member) =>
        member.balance < 0
          ? total + Math.abs(member.balance)
          : total,
      0
    );
  }, [memberBalances]);

  if (loading) {
    return (
      <div className="mb-loading">
        <div className="mb-loader" />
        <span>Calculating member balances...</span>
      </div>
    );
  }

  return (
    <div className="member-balance-page">
      <header className="mb-page-header">
        <div className="mb-heading">
          <div className="mb-heading-icon">
            <Scale size={22} />
          </div>

          <div>
            <span className="mb-eyebrow">
              Monthly accounting
            </span>

            <h1>Member Balance</h1>

            <p>
              Final member-wise settlement for{" "}
              {formatMonthName(selectedMonth)}.
            </p>
          </div>
        </div>

        <label className="mb-month-picker">
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

      <section className="mb-summary-grid">
        <article className="mb-summary-card">
          <div className="mb-card-icon members">
            <Users size={19} />
          </div>

          <div>
            <span>Members</span>
            <strong>{reportMembers.length}</strong>
          </div>
        </article>

        <article className="mb-summary-card">
          <div className="mb-card-icon meals">
            <Utensils size={19} />
          </div>

          <div>
            <span>Total Meals</span>
            <strong>{formatMeal(totalMeals)}</strong>
          </div>
        </article>

        <article className="mb-summary-card">
          <div className="mb-card-icon bazaar">
            <ShoppingBasket size={19} />
          </div>

          <div>
            <span>Total Bazaar</span>
            <strong>৳{formatMoney(totalBazaar)}</strong>
          </div>
        </article>

        <article className="mb-summary-card featured">
          <div className="mb-card-icon rate">
            <CircleDollarSign size={19} />
          </div>

          <div>
            <span>Meal Rate</span>
            <strong>৳{formatMoney(mealRate)}</strong>
          </div>
        </article>
      </section>

      <section className="mb-table-card">
        <header className="mb-table-header">
          <div>
            <h2>Final Member-wise Settlement</h2>
            <p>
              Bazaar payment minus meal bill determines the
              final balance.
            </p>
          </div>

          <span className="mb-member-count">
            {memberBalances.length} members
          </span>
        </header>

        <div className="report-table-wrapper">
          <table className="member-balance-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Meal</th>
                <th>Bazaar</th>
                <th>Bill</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {memberBalances.length === 0 ? (
                <tr>
                  <td colSpan="6" className="mb-empty">
                    No member balance found for this month.
                  </td>
                </tr>
              ) : (
                memberBalances.map((member) => {
                  const willReceive =
                    member.balance > 0.005;

                  const willPay =
                    member.balance < -0.005;

                  return (
                    <tr key={member.id}>
                      <td className="mb-member-cell">
                        <div
                          className="mb-member-avatar"
                          title={member.name}
                        >
                          {member.name
                            ?.charAt(0)
                            .toUpperCase() || "M"}
                        </div>

                        <div className="mb-member-details">
                          <strong
                            className="balance-member-name"
                            title={member.name}
                          >
                            {getDisplayName(member.name)}
                          </strong>

                          {!member.active && (
                            <small>Former</small>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="mb-meal-value">
                          {formatMeal(member.totalMeal)}
                        </span>
                      </td>

                      <td>
                        ৳{formatMoney(member.bazaarPaid)}
                      </td>

                      <td>
                        ৳{formatMoney(member.mealBill)}
                      </td>

                      <td>
                        <strong
                          className={
                            willReceive
                              ? "mb-balance positive"
                              : willPay
                              ? "mb-balance negative"
                              : "mb-balance neutral"
                          }
                        >
                          {willReceive ? "+" : ""}
                          {willPay ? "−" : ""}
                          ৳
                          {formatMoney(
                            Math.abs(member.balance)
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            willReceive
                              ? "mb-status receive"
                              : willPay
                              ? "mb-status pay"
                              : "mb-status settled"
                          }
                        >
                          {willReceive
                            ? "পাবে"
                            : willPay
                            ? "দেবে"
                            : "সমান"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {memberBalances.length > 0 && (
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th>{formatMeal(totalMeals)}</th>
                  <th>৳{formatMoney(totalBazaar)}</th>
                  <th>৳{formatMoney(totalBazaar)}</th>
                  <th colSpan="2">Balanced</th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="mb-final-summary">
        <article>
          <span>Total টাকা পাবে</span>
          <strong className="positive">
            ৳{formatMoney(totalReceivable)}
          </strong>
        </article>

        <article>
          <span>Total টাকা দেবে</span>
          <strong className="negative">
            ৳{formatMoney(totalPayable)}
          </strong>
        </article>

        <article>
          <span>Difference</span>
          <strong>
            ৳
            {formatMoney(
              Math.abs(totalReceivable - totalPayable)
            )}
          </strong>
        </article>
      </section>
    </div>
  );
};

export default MemberBalance;