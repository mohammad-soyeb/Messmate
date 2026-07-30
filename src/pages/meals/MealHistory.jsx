import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  Filter,
  History,
  Search,
  Utensils,
} from "lucide-react";
import toast from "react-hot-toast";

import { getWorkspaceData } from "../../services/dataService";

const getCurrentMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
};

const formatDate = (dateString) => {
  if (!dateString) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
};

const formatMealNumber = (value) => {
  const number = Number(value) || 0;

  return Number.isInteger(number)
    ? number
    : number.toFixed(1);
};

const MealHistory = () => {
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());
  const [selectedMember, setSelectedMember] =
    useState("all");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadMealHistory = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        setMembers(data.members || []);
        setMeals(data.meals || []);
      } catch (error) {
        console.error(
          "Unable to load meal history:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load meal history."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMealHistory();

    return () => {
      active = false;
    };
  }, []);

  const filteredMeals = useMemo(() => {
    const query = searchText
      .trim()
      .toLowerCase();

    return meals
      .filter((meal) => {
        const matchesMonth = selectedMonth
          ? meal.date?.startsWith(selectedMonth)
          : true;

        const matchesMember =
          selectedMember === "all"
            ? true
            : meal.memberId === selectedMember;

        const matchesSearch = query
          ? meal.memberName
              ?.toLowerCase()
              .includes(query)
          : true;

        return (
          matchesMonth &&
          matchesMember &&
          matchesSearch
        );
      })
      .sort((firstMeal, secondMeal) =>
        String(secondMeal.date).localeCompare(
          String(firstMeal.date)
        )
      );
  }, [
    meals,
    searchText,
    selectedMember,
    selectedMonth,
  ]);

  const historySummary = useMemo(() => {
    return filteredMeals.reduce(
      (summary, meal) => {
        const breakfast =
          Number(meal.breakfast) || 0;
        const lunch = Number(meal.lunch) || 0;
        const dinner = Number(meal.dinner) || 0;

        summary.breakfast += breakfast;
        summary.lunch += lunch;
        summary.dinner += dinner;
        summary.total +=
          breakfast + lunch + dinner;

        return summary;
      },
      {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        total: 0,
      }
    );
  }, [filteredMeals]);

  const resetFilters = () => {
    setSelectedMonth(getCurrentMonth());
    setSelectedMember("all");
    setSearchText("");
  };

  return (
    <div className="meal-history-page">
      <header className="meal-subpage-header">
        <div>
          <span className="meal-subpage-eyebrow">
            <History size={15} />
            Previous records
          </span>

          <h2>Meal History</h2>

          <p>
            Find meal records by month, member or
            member name.
          </p>
        </div>

        <div className="meal-history-count">
          <Utensils size={17} />

          <span>
            {filteredMeals.length}{" "}
            {filteredMeals.length === 1
              ? "record"
              : "records"}
          </span>
        </div>
      </header>

      <section className="meal-filter-card">
        <div className="meal-filter-heading">
          <Filter size={18} />
          <span>Filter records</span>
        </div>

        <div className="meal-filter-grid">
          <label className="meal-filter-field">
            <span>Month</span>

            <div className="meal-filter-control">
              <CalendarDays size={17} />

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(
                    event.target.value
                  )
                }
              />
            </div>
          </label>

          <label className="meal-filter-field">
            <span>Member</span>

            <select
              value={selectedMember}
              onChange={(event) =>
                setSelectedMember(
                  event.target.value
                )
              }
            >
              <option value="all">
                All members
              </option>

              {members.map((member) => (
                <option
                  key={member.id}
                  value={member.id}
                >
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="meal-filter-field">
            <span>Search member</span>

            <div className="meal-filter-control">
              <Search size={17} />

              <input
                type="search"
                value={searchText}
                placeholder="Enter member name"
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
              />
            </div>
          </label>

          <button
            type="button"
            className="meal-reset-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>
      </section>

      <section className="meal-history-summary">
        <article>
          <span>Breakfast</span>
          <strong>
            {formatMealNumber(
              historySummary.breakfast
            )}
          </strong>
        </article>

        <article>
          <span>Lunch</span>
          <strong>
            {formatMealNumber(
              historySummary.lunch
            )}
          </strong>
        </article>

        <article>
          <span>Dinner</span>
          <strong>
            {formatMealNumber(
              historySummary.dinner
            )}
          </strong>
        </article>

        <article className="primary">
          <span>Total meals</span>
          <strong>
            {formatMealNumber(
              historySummary.total
            )}
          </strong>
        </article>
      </section>

      <section className="meal-history-table-card">
        <div className="meal-history-table-title">
          <div>
            <h3>Meal records</h3>
            <p>
              Showing records for the selected
              filters.
            </p>
          </div>
        </div>

        <div className="meal-table-wrapper">
          <table className="meal-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Breakfast</th>
                <th>Lunch</th>
                <th>Dinner</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="meal-empty-state"
                  >
                    Loading meal history...
                  </td>
                </tr>
              ) : filteredMeals.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="meal-empty-state"
                  >
                    No meal records found for the
                    selected filters.
                  </td>
                </tr>
              ) : (
                filteredMeals.map((meal) => {
                  const total =
                    Number(meal.breakfast || 0) +
                    Number(meal.lunch || 0) +
                    Number(meal.dinner || 0);

                  return (
                    <tr key={meal.id}>
                      <td>
                        <div className="meal-date-cell">
                          <CalendarDays size={16} />
                          {formatDate(meal.date)}
                        </div>
                      </td>

                      <td>
                        <div className="meal-history-member">
                          <span>
                            {meal.memberName
                              ?.charAt(0)
                              .toUpperCase() || "M"}
                          </span>

                          <strong>
                            {meal.memberName ||
                              "Unknown member"}
                          </strong>
                        </div>
                      </td>

                      <td>
                        {formatMealNumber(
                          meal.breakfast
                        )}
                      </td>

                      <td>
                        {formatMealNumber(
                          meal.lunch
                        )}
                      </td>

                      <td>
                        {formatMealNumber(
                          meal.dinner
                        )}
                      </td>

                      <td>
                        <strong className="meal-row-total">
                          {formatMealNumber(total)}
                        </strong>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MealHistory;