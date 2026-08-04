import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ShoppingBasket,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getWorkspaceData } from "../services/dataService";
import "../styles/dashboard.css";

const getTodayDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const day = String(today.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
};

const getCurrentMonth = () => {
  return getTodayDate().substring(0, 7);
};

const getMealTotal = (meal) => {
  return (
    Number(meal.breakfast || 0) +
    Number(meal.lunch || 0) +
    Number(meal.dinner || 0)
  );
};

const getBazaarTotal = (entry) => {
  return Number(entry.grandTotal || 0);
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
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

const formatDate = (dateString) => {
  if (!dateString) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
};

const formatMonthName = (monthValue) => {
  const [year, month] = monthValue
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] =
    useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(
    async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        setMembers(data.members || []);
        setMeals(data.meals || []);
        setBazaarEntries(
          data.bazaarEntries || []
        );
      } catch (error) {
        console.error(
          "Unable to load dashboard:",
          error
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboardData();

    window.addEventListener(
      "focus",
      loadDashboardData
    );

    return () => {
      window.removeEventListener(
        "focus",
        loadDashboardData
      );
    };
  }, [loadDashboardData]);

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

  const totalMonthlyMeals = useMemo(() => {
    return monthlyMeals.reduce(
      (total, meal) =>
        total + getMealTotal(meal),
      0
    );
  }, [monthlyMeals]);

  const totalMonthlyBazaar = useMemo(() => {
    return monthlyBazaarEntries.reduce(
      (total, entry) =>
        total + getBazaarTotal(entry),
      0
    );
  }, [monthlyBazaarEntries]);

  const mealRate =
    totalMonthlyMeals > 0
      ? totalMonthlyBazaar /
        totalMonthlyMeals
      : 0;

  const todayMeals = useMemo(() => {
    const today = getTodayDate();

    return meals
      .filter((meal) => meal.date === today)
      .reduce(
        (total, meal) =>
          total + getMealTotal(meal),
        0
      );
  }, [meals]);

  const todayBazaar = useMemo(() => {
    const today = getTodayDate();

    return bazaarEntries
      .filter((entry) => entry.date === today)
      .reduce(
        (total, entry) =>
          total + getBazaarTotal(entry),
        0
      );
  }, [bazaarEntries]);

  const activeMembers = useMemo(() => {
    const activeMemberIds = new Set(
      monthlyMeals
        .filter(
          (meal) => getMealTotal(meal) > 0
        )
        .map((meal) => meal.memberId)
        .filter(Boolean)
    );

    return activeMemberIds.size;
  }, [monthlyMeals]);

  const recentBazaarEntries = useMemo(() => {
    return [...bazaarEntries]
      .sort((firstEntry, secondEntry) => {
        const dateComparison = String(
          secondEntry.date
        ).localeCompare(
          String(firstEntry.date)
        );

        if (dateComparison !== 0) {
          return dateComparison;
        }

        return String(
          secondEntry.createdAt || ""
        ).localeCompare(
          String(firstEntry.createdAt || "")
        );
      })
      .slice(0, 4);
  }, [bazaarEntries]);

  const dashboardStats = [
    {
      id: "members",
      title: "Total Members",
      value: members.length,
      description: `${activeMembers} active this month`,
      icon: Users,
      className: "members",
    },
    {
      id: "today-meals",
      title: "Today's Meals",
      value: formatMeal(todayMeals),
      description: "All members today",
      icon: Utensils,
      className: "meals",
    },
    {
      id: "monthly-meals",
      title: "Monthly Meals",
      value: formatMeal(totalMonthlyMeals),
      description: formatMonthName(selectedMonth),
      icon: TrendingUp,
      className: "monthly",
    },
    {
      id: "bazaar",
      title: "Monthly Bazaar",
      value: `৳${formatMoney(
        totalMonthlyBazaar
      )}`,
      description: `Today ৳${formatMoney(
        todayBazaar
      )}`,
      icon: ShoppingBasket,
      className: "bazaar",
    },
    {
      id: "meal-rate",
      title: "Current Meal Rate",
      value: `৳${formatMoney(mealRate)}`,
      description: "Bazaar ÷ total meals",
      icon: CircleDollarSign,
      className: "rate",
      featured: true,
    },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-label">
            Workspace overview
          </span>

          <h1>Dashboard</h1>

          <p>
            {new Date().toLocaleDateString(
              "en-BD",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )}
          </p>
        </div>

        <div className="dashboard-month-field">
          <label htmlFor="dashboardMonth">
            <CalendarDays size={14} />
            Summary month
          </label>

          <input
            id="dashboardMonth"
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(
                event.target.value
              )
            }
          />
        </div>
      </header>

      <section className="dashboard-stats-grid">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.id}
              className={`dashboard-stat-card ${
                stat.className
              } ${
                stat.featured ? "featured" : ""
              }`}
            >
              <div className="dashboard-stat-icon">
                <Icon size={18} />
              </div>

              <div className="dashboard-stat-content">
                <span>{stat.title}</span>

                <strong>
                  {loading ? "—" : stat.value}
                </strong>

                <small>
                  {stat.description}
                </small>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-panel dashboard-bazaar-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Recent Bazaar</h2>

            <p>
              Latest purchases added by mess
              members.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/bazaar/history")
            }
          >
            View history
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="dashboard-list">
          {loading ? (
            <div className="dashboard-empty-state">
              Loading recent bazaar...
            </div>
          ) : recentBazaarEntries.length === 0 ? (
            <div className="dashboard-empty-state">
              <ShoppingBasket size={27} />

              <strong>
                No bazaar records yet
              </strong>

              <span>
                New bazaar entries will appear here.
              </span>
            </div>
          ) : (
            recentBazaarEntries.map((entry) => (
              <div
                className="dashboard-list-item"
                key={entry.id}
              >
                <div className="dashboard-list-icon">
                  <ShoppingBasket size={15} />
                </div>

                <div className="dashboard-list-details">
                  <strong>
                    {entry.memberName ||
                      "Unknown member"}
                  </strong>

                  <span>
                    {formatDate(entry.date)}
                    {" · "}
                    {entry.items?.length || 0}{" "}
                    {(entry.items?.length || 0) ===
                    1
                      ? "item"
                      : "items"}
                  </span>
                </div>

                <strong className="dashboard-list-amount">
                  ৳
                  {formatMoney(
                    getBazaarTotal(entry)
                  )}
                </strong>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;