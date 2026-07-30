import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarCheck,
  Coffee,
  Moon,
  PieChart,
  Sun,
  Users,
  Utensils,
} from "lucide-react";
import toast from "react-hot-toast";

import { getWorkspaceData } from "../../services/dataService";

const getLocalDate = () => {
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

const formatMealNumber = (value) => {
  const number = Number(value) || 0;

  return Number.isInteger(number)
    ? number
    : number.toFixed(1);
};

const formatFullDate = (dateString) => {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
};

const formatMonthName = (dateString) => {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
};

const MealReport = () => {
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = getLocalDate();
  const currentMonth = today.substring(0, 7);
  const currentDay = Number(today.substring(8, 10));

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
      } catch (error) {
        console.error(
          "Unable to load monthly meal report:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load monthly meal report."
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

  const currentMonthMeals = useMemo(() => {
    return meals.filter((meal) => {
      return (
        meal.date?.startsWith(currentMonth) &&
        meal.date <= today
      );
    });
  }, [currentMonth, meals, today]);

  const memberReports = useMemo(() => {
    return members
      .map((member) => {
        const memberMeals = currentMonthMeals.filter(
          (meal) => meal.memberId === member.id
        );

        const totals = memberMeals.reduce(
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

            if (
              breakfast + lunch + dinner > 0
            ) {
              summary.activeDays += 1;
            }

            return summary;
          },
          {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            total: 0,
            activeDays: 0,
          }
        );

        return {
          ...member,
          ...totals,
          average:
            currentDay > 0
              ? totals.total / currentDay
              : 0,
        };
      })
      .sort((firstMember, secondMember) => {
        return secondMember.total - firstMember.total;
      });
  }, [
    currentDay,
    currentMonthMeals,
    members,
  ]);

  const reportSummary = useMemo(() => {
    return memberReports.reduce(
      (summary, member) => {
        summary.breakfast += member.breakfast;
        summary.lunch += member.lunch;
        summary.dinner += member.dinner;
        summary.total += member.total;

        return summary;
      },
      {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        total: 0,
      }
    );
  }, [memberReports]);

  return (
    <div className="meal-report-page">
      <header className="meal-subpage-header">
        <div>
          <span className="meal-subpage-eyebrow">
            <PieChart size={15} />
            Current month overview
          </span>

          <h2>Monthly Meal Report</h2>

          <p>
            {formatMonthName(today)} মাসের ১ তারিখ
            থেকে {formatFullDate(today)} পর্যন্ত
            প্রত্যেক সদস্যের meal হিসাব।
          </p>
        </div>

        <div className="meal-report-date">
          <CalendarCheck size={18} />

          <div>
            <span>Report until</span>
            <strong>
              {formatFullDate(today)}
            </strong>
          </div>
        </div>
      </header>

      <section className="meal-report-summary">
        <article>
          <div className="meal-report-summary-icon breakfast">
            <Coffee size={21} />
          </div>

          <div>
            <span>Total breakfast</span>
            <strong>
              {formatMealNumber(
                reportSummary.breakfast
              )}
            </strong>
          </div>
        </article>

        <article>
          <div className="meal-report-summary-icon lunch">
            <Sun size={21} />
          </div>

          <div>
            <span>Total lunch</span>
            <strong>
              {formatMealNumber(
                reportSummary.lunch
              )}
            </strong>
          </div>
        </article>

        <article>
          <div className="meal-report-summary-icon dinner">
            <Moon size={21} />
          </div>

          <div>
            <span>Total dinner</span>
            <strong>
              {formatMealNumber(
                reportSummary.dinner
              )}
            </strong>
          </div>
        </article>

        <article className="total">
          <div className="meal-report-summary-icon total">
            <Utensils size={21} />
          </div>

          <div>
            <span>All meals</span>
            <strong>
              {formatMealNumber(
                reportSummary.total
              )}
            </strong>
          </div>
        </article>
      </section>

      <section className="meal-progress-card">
        <div className="meal-progress-heading">
          <div>
            <span>Current month progress</span>
            <strong>
              Day {currentDay} of{" "}
              {new Date(
                Number(today.substring(0, 4)),
                Number(today.substring(5, 7)),
                0
              ).getDate()}
            </strong>
          </div>

          <CalendarCheck size={22} />
        </div>

        <div className="meal-progress-track">
          <span
            style={{
              width: `${
                (currentDay /
                  new Date(
                    Number(
                      today.substring(0, 4)
                    ),
                    Number(
                      today.substring(5, 7)
                    ),
                    0
                  ).getDate()) *
                100
              }%`,
            }}
          />
        </div>

        <p>
          এই report-এ ভবিষ্যতের কোনো তারিখের meal
          যুক্ত হবে না।
        </p>
      </section>

      <section className="meal-report-table-card">
        <div className="meal-report-table-heading">
          <div>
            <h3>Member-wise meal report</h3>

            <p>
              মাসের ১ তারিখ থেকে আজ পর্যন্ত মোট
              meal।
            </p>
          </div>

          <div className="meal-member-count">
            <Users size={17} />
            {members.length} members
          </div>
        </div>

        <div className="meal-table-wrapper">
          <table className="meal-report-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Breakfast</th>
                <th>Lunch</th>
                <th>Dinner</th>
                <th>Total meals</th>
                <th>Meal days</th>
                <th>Daily average</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="meal-empty-state"
                  >
                    Loading monthly report...
                  </td>
                </tr>
              ) : memberReports.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="meal-empty-state"
                  >
                    No members found.
                  </td>
                </tr>
              ) : (
                memberReports.map(
                  (member, index) => (
                    <tr key={member.id}>
                      <td>
                        <div className="meal-report-member">
                          <div className="meal-report-rank">
                            {index + 1}
                          </div>

                          <div className="meal-report-avatar">
                            {member.name
                              ?.charAt(0)
                              .toUpperCase() || "M"}
                          </div>

                          <div>
                            <strong>
                              {member.name}
                            </strong>

                            <span>
                              {member.room
                                ? `Room ${member.room}`
                                : member.role ===
                                    "manager"
                                  ? "Manager"
                                  : "Mess member"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {formatMealNumber(
                          member.breakfast
                        )}
                      </td>

                      <td>
                        {formatMealNumber(
                          member.lunch
                        )}
                      </td>

                      <td>
                        {formatMealNumber(
                          member.dinner
                        )}
                      </td>

                      <td>
                        <strong className="meal-report-total">
                          {formatMealNumber(
                            member.total
                          )}
                        </strong>
                      </td>

                      <td>
                        {member.activeDays} days
                      </td>

                      <td>
                        {formatMealNumber(
                          member.average
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MealReport;