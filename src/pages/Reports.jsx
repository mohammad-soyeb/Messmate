import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Equal,
  ShoppingBasket,
  Sigma,
  Users,
  Utensils,
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

const getMealTotal = (meal) => {
  return (
    Number(meal.breakfast || 0) +
    Number(meal.lunch || 0) +
    Number(meal.dinner || 0)
  );
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
  const [year, month] = monthValue
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
};

const Reports = () => {
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] =
    useState([]);
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        setMembers(data.members || []);
        setMeals(data.meals || []);
        setBazaarEntries(
          data.bazaarEntries || []
        );
      } catch (error) {
        console.error(
          "Unable to load settlement:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load monthly settlement."
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
        total +
        (Number(entry.grandTotal) || 0),
      0
    );
  }, [monthlyBazaar]);

  const mealRate =
    totalMeals > 0
      ? totalBazaar / totalMeals
      : 0;

  const calculatedMealCost =
    totalMeals * mealRate;

  const settlementDifference =
    totalBazaar - calculatedMealCost;

  const activeMemberCount = useMemo(() => {
    const memberIds = new Set();

    monthlyMeals.forEach((meal) => {
      if (
        meal.memberId &&
        getMealTotal(meal) > 0
      ) {
        memberIds.add(meal.memberId);
      }
    });

    monthlyBazaar.forEach((entry) => {
      if (entry.memberId) {
        memberIds.add(entry.memberId);
      }
    });

    return memberIds.size;
  }, [monthlyBazaar, monthlyMeals]);

  const bazaarContributorCount =
    useMemo(() => {
      return new Set(
        monthlyBazaar
          .map((entry) => entry.memberId)
          .filter(Boolean)
      ).size;
    }, [monthlyBazaar]);

  const hasReportData =
    totalMeals > 0 || totalBazaar > 0;

  const settlementIsBalanced =
    Math.abs(settlementDifference) < 0.01;

  return (
    <div className="monthly-settlement-page">
      <header className="reports-subpage-header">
        <div>
          <span className="reports-subpage-eyebrow">
            <Sigma size={14} />
            Monthly overview
          </span>

          <h2>Monthly Settlement</h2>

          <p>
            Essential meal and bazaar accounting for
            the selected month.
          </p>
        </div>

        <label className="report-month-control">
          <span>
            <CalendarDays size={13} />
            Report month
          </span>

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

      <section className="report-period-card">
        <CalendarDays size={17} />

        <div>
          <span>Settlement period</span>

          <strong>
            {formatMonthName(selectedMonth)}
          </strong>
        </div>
      </section>

      <section className="report-summary-grid">
        <article>
          <div className="report-summary-icon members">
            <Users size={18} />
          </div>

          <div>
            <span>Active members</span>

            <strong>
              {loading
                ? "—"
                : activeMemberCount}
            </strong>

            <small>
              Out of {members.length} members
            </small>
          </div>
        </article>

        <article>
          <div className="report-summary-icon meals">
            <Utensils size={18} />
          </div>

          <div>
            <span>Total meals</span>

            <strong>
              {loading
                ? "—"
                : formatMeal(totalMeals)}
            </strong>

            <small>
              All members combined
            </small>
          </div>
        </article>

        <article>
          <div className="report-summary-icon bazaar">
            <ShoppingBasket size={18} />
          </div>

          <div>
            <span>Total bazaar</span>

            <strong>
              {loading
                ? "—"
                : `৳${formatMoney(
                    totalBazaar
                  )}`}
            </strong>

            <small>
              {bazaarContributorCount} contributors
            </small>
          </div>
        </article>

        <article className="featured">
          <div className="report-summary-icon rate">
            <CircleDollarSign size={18} />
          </div>

          <div>
            <span>Meal rate</span>

            <strong>
              {loading
                ? "—"
                : `৳${formatMoney(
                    mealRate
                  )}`}
            </strong>

            <small>Cost per meal</small>
          </div>
        </article>
      </section>

      {!loading && !hasReportData ? (
        <section className="settlement-empty-card">
          <Utensils size={27} />

          <strong>
            No settlement data found
          </strong>

          <p>
            No meal or bazaar records are available
            for {formatMonthName(selectedMonth)}.
          </p>
        </section>
      ) : (
        <section className="settlement-calculation-card">
          <div className="settlement-calculation-heading">
            <div>
              <span>Final calculation</span>

              <h3>Meal Rate Calculation</h3>
            </div>

            <div
              className={`settlement-status ${
                settlementIsBalanced
                  ? "balanced"
                  : "difference"
              }`}
            >
              <CheckCircle2 size={14} />

              {settlementIsBalanced
                ? "Balanced"
                : "Check difference"}
            </div>
          </div>

          <div className="settlement-formula">
            <div>
              <ShoppingBasket size={17} />

              <span>Total Bazaar</span>

              <strong>
                ৳{formatMoney(totalBazaar)}
              </strong>
            </div>

            <span className="formula-symbol">
              ÷
            </span>

            <div>
              <Utensils size={17} />

              <span>Total Meals</span>

              <strong>
                {formatMeal(totalMeals)}
              </strong>
            </div>

            <Equal
              className="formula-symbol"
              size={18}
            />

            <div className="result">
              <CircleDollarSign size={17} />

              <span>Meal Rate</span>

              <strong>
                ৳{formatMoney(mealRate)}
              </strong>
            </div>
          </div>

          <div className="settlement-verification">
            <div>
              <span>
                Calculated total meal cost
              </span>

              <strong>
                ৳
                {formatMoney(
                  calculatedMealCost
                )}
              </strong>
            </div>

            <div>
              <span>Settlement difference</span>

              <strong
                className={
                  settlementIsBalanced
                    ? "balanced"
                    : "difference"
                }
              >
                ৳
                {formatMoney(
                  settlementDifference
                )}
              </strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Reports;