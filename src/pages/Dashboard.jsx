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

const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
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

const Dashboard = () => {
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] =
    useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await getWorkspaceData();
      setMembers(data.members);
      setMeals(data.meals);
      setBazaarEntries(data.bazaarEntries);
    } catch (error) {
      console.error(
        "Unable to load dashboard:",
        error
      );
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const handleWindowFocus = () => {
      loadDashboardData();
    };

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleWindowFocus
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
    const memberIds = new Set(
      monthlyMeals
        .filter(
          (meal) => getMealTotal(meal) > 0
        )
        .map(
          (meal) =>
            meal.memberId ||
            meal.memberName ||
            meal.member
        )
    );

    return memberIds.size;
  }, [monthlyMeals]);

  const recentBazaarEntries = useMemo(() => {
    return [...bazaarEntries]
      .sort((firstEntry, secondEntry) => {
        const dateDifference =
          new Date(secondEntry.date) -
          new Date(firstEntry.date);

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return (
          new Date(
            secondEntry.createdAt || 0
          ) -
          new Date(
            firstEntry.createdAt || 0
          )
        );
      })
      .slice(0, 5);
  }, [bazaarEntries]);

  const recentMealEntries = useMemo(() => {
    return [...meals]
      .sort((firstMeal, secondMeal) => {
        const dateDifference =
          new Date(secondMeal.date) -
          new Date(firstMeal.date);

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return (
          new Date(
            secondMeal.updatedAt ||
              secondMeal.createdAt ||
              0
          ) -
          new Date(
            firstMeal.updatedAt ||
              firstMeal.createdAt ||
              0
          )
        );
      })
      .slice(0, 5);
  }, [meals]);

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
      value: `৳ ${formatMoney(
        totalMonthlyBazaar
      )}`,
      description: `Today ৳ ${formatMoney(
        todayBazaar
      )}`,
      icon: ShoppingBasket,
      className: "bazaar",
    },
    {
      id: "meal-rate",
      title: "Current Meal Rate",
      value: `৳ ${formatMoney(mealRate)}`,
      description: "Bazaar ÷ total meal",
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
            MESSMATE OVERVIEW
          </span>

          <h1>Dashboard</h1>

          <p>
            {new Date().toLocaleDateString(
              "en-BD",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}
          </p>
        </div>

        <div className="dashboard-month-field">
          <label htmlFor="dashboardMonth">
            <CalendarDays size={16} />
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
              className={`dashboard-stat-card ${
                stat.className
              } ${
                stat.featured ? "featured" : ""
              }`}
              key={stat.id}
            >
              <div className="dashboard-stat-icon">
                <Icon size={23} />
              </div>

              <div className="dashboard-stat-content">
                <span>{stat.title}</span>

                <strong>{stat.value}</strong>

                <small>
                  {stat.description}
                </small>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-content-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Recent Bazaar</h2>

              <p>
                Latest bazaar entries from all
                members
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/bazaar")
              }
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="dashboard-list">
            {recentBazaarEntries.length === 0 ? (
              <div className="dashboard-empty-state">
                <ShoppingBasket size={34} />

                <strong>
                  No bazaar records yet
                </strong>

                <span>
                  New bazaar entries will appear
                  here.
                </span>
              </div>
            ) : (
              recentBazaarEntries.map(
                (entry) => (
                  <div
                    className="dashboard-list-item"
                    key={entry.id}
                  >
                    <div className="dashboard-list-icon bazaar">
                      <ShoppingBasket
                        size={18}
                      />
                    </div>

                    <div className="dashboard-list-details">
                      <strong>
                        {entry.memberName ||
                          entry.member ||
                          "Unknown Member"}
                      </strong>

                      <span>
                        {formatDate(
                          entry.date
                        )}{" "}
                        •{" "}
                        {entry.items?.length ||
                          1}{" "}
                        item
                        {(entry.items?.length ||
                          1) > 1
                          ? "s"
                          : ""}
                      </span>
                    </div>

                    <strong className="dashboard-list-amount">
                      ৳{" "}
                      {formatMoney(
                        getBazaarTotal(entry)
                      )}
                    </strong>
                  </div>
                )
              )
            )}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Recent Meals</h2>

              <p>
                Latest saved daily meal records
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/meals")
              }
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="dashboard-list">
            {recentMealEntries.length === 0 ? (
              <div className="dashboard-empty-state">
                <Utensils size={34} />

                <strong>
                  No meal records yet
                </strong>

                <span>
                  Saved meal entries will appear
                  here.
                </span>
              </div>
            ) : (
              recentMealEntries.map((meal) => (
                <div
                  className="dashboard-list-item"
                  key={meal.id}
                >
                  <div className="dashboard-list-icon meals">
                    <Utensils size={18} />
                  </div>

                  <div className="dashboard-list-details">
                    <strong>
                      {meal.memberName ||
                        meal.member ||
                        "Unknown Member"}
                    </strong>

                    <span>
                      {formatDate(meal.date)}
                    </span>
                  </div>

                  <strong className="dashboard-meal-amount">
                    {formatMeal(
                      getMealTotal(meal)
                    )}{" "}
                    meals
                  </strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-month-summary">
        <div>
          <span>Selected Month</span>

          <strong>
            {formatMonthName(selectedMonth)}
          </strong>
        </div>

        <div>
          <span>Total Meals</span>

          <strong>
            {formatMeal(totalMonthlyMeals)}
          </strong>
        </div>

        <div>
          <span>Total Bazaar</span>

          <strong>
            ৳ {formatMoney(totalMonthlyBazaar)}
          </strong>
        </div>

        <div className="highlight">
          <span>Meal Rate</span>

          <strong>
            ৳ {formatMoney(mealRate)}
          </strong>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
