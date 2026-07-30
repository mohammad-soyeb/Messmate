import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Lock,
  Minus,
  Plus,
  Save,
  Utensils,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../context/AuthContext";
import {
  getWorkspaceData,
  saveMeal,
} from "../services/dataService";
import "../styles/meals.css";

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

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const formatMealNumber = (value) => {
  const number = Number(value) || 0;

  return Number.isInteger(number)
    ? number
    : number.toFixed(1);
};

const formatSelectedDate = (dateString) => {
  if (!dateString) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
};

const changeDateByDays = (dateString, numberOfDays) => {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(
    date.getUTCDate() + numberOfDays
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(
      2,
      "0"
    ),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const Meals = () => {
  const { user } = useContext(AuthContext);

  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [selectedDate, setSelectedDate] =
    useState(getTodayDate());
  const [draftMeals, setDraftMeals] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const data = await getWorkspaceData();

        if (active) {
          setMembers(data.members);
          setMeals(data.meals);
        }
      } catch (error) {
        console.error(
          "Unable to load meals:",
          error
        );
        toast.error(
          error.message || "Unable to load meals."
        );
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [user]);

  const currentMember = useMemo(() => {
    if (!user) {
      return null;
    }

    return (
      members.find((member) => {
        if (member.userId && user?.id) {
          return member.userId === user.id;
        }

        const sameEmail =
          user.email &&
          member.email &&
          normalizeText(member.email) ===
            normalizeText(user.email);

        const sameName =
          user.name &&
          member.name &&
          normalizeText(member.name) ===
            normalizeText(user.name);

        return sameEmail || sameName;
      }) || null
    );
  }, [members, user]);

  useEffect(() => {
    const dateDraft = {};

    members.forEach((member) => {
      const savedMeal = meals.find(
        (meal) =>
          meal.memberId === member.id &&
          meal.date === selectedDate
      );

      dateDraft[member.id] = {
        breakfast:
          Number(savedMeal?.breakfast) || 0,
        lunch: Number(savedMeal?.lunch) || 0,
        dinner: Number(savedMeal?.dinner) || 0,
      };
    });

    setDraftMeals(dateDraft);
  }, [members, meals, selectedDate]);

  const selectedDateMeals = useMemo(() => {
    return meals.filter(
      (meal) => meal.date === selectedDate
    );
  }, [meals, selectedDate]);

  const dailyTotal = useMemo(() => {
    return Object.values(draftMeals).reduce(
      (grandTotal, memberMeal) => {
        return (
          grandTotal +
          Number(memberMeal.breakfast || 0) +
          Number(memberMeal.lunch || 0) +
          Number(memberMeal.dinner || 0)
        );
      },
      0
    );
  }, [draftMeals]);

  const monthlyTotal = useMemo(() => {
    const selectedMonth =
      selectedDate.substring(0, 7);

    return meals
      .filter((meal) =>
        meal.date?.startsWith(selectedMonth)
      )
      .reduce((total, meal) => {
        return (
          total +
          Number(meal.breakfast || 0) +
          Number(meal.lunch || 0) +
          Number(meal.dinner || 0)
        );
      }, 0);
  }, [meals, selectedDate]);

  const currentMemberDailyTotal = useMemo(() => {
    if (!currentMember) {
      return 0;
    }

    const memberMeal =
      draftMeals[currentMember.id];

    if (!memberMeal) {
      return 0;
    }

    return (
      Number(memberMeal.breakfast || 0) +
      Number(memberMeal.lunch || 0) +
      Number(memberMeal.dinner || 0)
    );
  }, [currentMember, draftMeals]);

  const currentMemberMonthlyTotal = useMemo(() => {
    if (!currentMember) {
      return 0;
    }

    const selectedMonth =
      selectedDate.substring(0, 7);

    return meals
      .filter(
        (meal) =>
          meal.memberId === currentMember.id &&
          meal.date?.startsWith(selectedMonth)
      )
      .reduce((total, meal) => {
        return (
          total +
          Number(meal.breakfast || 0) +
          Number(meal.lunch || 0) +
          Number(meal.dinner || 0)
        );
      }, 0);
  }, [currentMember, meals, selectedDate]);

  const handleMealChange = (
    memberId,
    mealType,
    amount
  ) => {
    const canEdit =
      memberId === currentMember?.id ||
      currentMember?.role === "manager";

    if (!canEdit) {
      return;
    }

    setDraftMeals((previousDraft) => {
      const currentValue = Number(
        previousDraft[memberId]?.[mealType] || 0
      );

      const nextValue = Math.max(
        0,
        Math.round(
          (currentValue + amount) * 2
        ) / 2
      );

      return {
        ...previousDraft,
        [memberId]: {
          breakfast:
            Number(
              previousDraft[memberId]?.breakfast
            ) || 0,
          lunch:
            Number(
              previousDraft[memberId]?.lunch
            ) || 0,
          dinner:
            Number(
              previousDraft[memberId]?.dinner
            ) || 0,
          [mealType]: nextValue,
        },
      };
    });
  };

  const handleSaveMeal = async () => {
    if (!currentMember) {
      toast.error(
        "Your member profile could not be found."
      );
      return;
    }

    setSaving(true);

    try {
      const editableMembers =
        currentMember.role === "manager"
          ? members
          : [currentMember];

      const savedMeals = await Promise.all(
        editableMembers.map((member) => {
          const draft = draftMeals[member.id] || {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
          };

          return saveMeal({
            memberId: member.id,
            date: selectedDate,
            breakfast: draft.breakfast,
            lunch: draft.lunch,
            dinner: draft.dinner,
          });
        })
      );

      setMeals((currentMeals) => {
        const savedById = new Map(
          savedMeals.map((meal) => [
            meal.id,
            meal,
          ])
        );
        const updatedMeals = currentMeals.map(
          (meal) => savedById.get(meal.id) || meal
        );
        const currentIds = new Set(
          currentMeals.map((meal) => meal.id)
        );

        return [
          ...updatedMeals,
          ...savedMeals.filter(
            (meal) => !currentIds.has(meal.id)
          ),
        ];
      });
      toast.success(
        currentMember.role === "manager"
          ? "Daily meals saved successfully."
          : "Meal saved successfully."
      );
    } catch (error) {
      console.error("Meal save error:", error);
      toast.error("Unable to save the meal.");
    } finally {
      setSaving(false);
    }
  };

  const goToPreviousDate = () => {
    setSelectedDate((currentDate) =>
      changeDateByDays(currentDate, -1)
    );
  };

  const goToNextDate = () => {
    setSelectedDate((currentDate) =>
      changeDateByDays(currentDate, 1)
    );
  };

  const goToToday = () => {
    setSelectedDate(getTodayDate());
  };

  return (
    <div className="page-container meals-page">
      <div className="meal-page-header">
        <div>
          <div className="meal-heading-icon">
            <Utensils size={24} />
          </div>

          <div>
            <h1>Daily Meals</h1>
            <p>
              Add your meals and view everyone&apos;s
              daily meal amount.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="meal-today-button"
          onClick={goToToday}
        >
          <CalendarDays size={17} />
          Today
        </button>
      </div>

      <div className="meal-summary-grid">
        <div className="meal-stat-card">
          <span>Today&apos;s total</span>
          <strong>
            {formatMealNumber(dailyTotal)}
          </strong>
          <small>Selected date meals</small>
        </div>

        <div className="meal-stat-card">
          <span>Your meal today</span>
          <strong>
            {formatMealNumber(
              currentMemberDailyTotal
            )}
          </strong>
          <small>
            Breakfast, lunch and dinner
          </small>
        </div>

        <div className="meal-stat-card">
          <span>Monthly total</span>
          <strong>
            {formatMealNumber(monthlyTotal)}
          </strong>
          <small>All members</small>
        </div>

        <div className="meal-stat-card">
          <span>Your monthly meal</span>
          <strong>
            {formatMealNumber(
              currentMemberMonthlyTotal
            )}
          </strong>
          <small>
            Current selected month
          </small>
        </div>
      </div>

      <div className="meal-date-card">
        <button
          type="button"
          className="meal-date-arrow"
          onClick={goToPreviousDate}
          aria-label="Previous date"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="meal-date-content">
          <span>Meal date</span>

          <strong>
            {formatSelectedDate(selectedDate)}
          </strong>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(event.target.value)
            }
          />
        </div>

        <button
          type="button"
          className="meal-date-arrow"
          onClick={goToNextDate}
          aria-label="Next date"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {!currentMember && (
        <div className="meal-warning">
          Your login account is not connected to a
          member profile. Add the same name or email in
          the Members page.
        </div>
      )}

      <div className="meal-sheet-card">
        <div className="meal-sheet-header">
          <div>
            <h2>Meal sheet</h2>
            <p>
              You can edit only your own meal row.
            </p>
          </div>

          <div className="meal-entry-count">
            {selectedDateMeals.length} saved{" "}
            {selectedDateMeals.length === 1
              ? "entry"
              : "entries"}
          </div>
        </div>

        <div className="meal-table-wrapper">
          <table className="daily-meal-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Breakfast</th>
                <th>Lunch</th>
                <th>Dinner</th>
                <th>Total</th>
                <th>Access</th>
              </tr>
            </thead>

            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="meal-empty-state"
                  >
                    No members found. Add members
                    first.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const isCurrentMember =
                    member.id === currentMember?.id;
                  const canEdit =
                    isCurrentMember ||
                    currentMember?.role ===
                      "manager";

                  const memberMeal =
                    draftMeals[member.id] || {
                      breakfast: 0,
                      lunch: 0,
                      dinner: 0,
                    };

                  const memberTotal =
                    Number(
                      memberMeal.breakfast || 0
                    ) +
                    Number(
                      memberMeal.lunch || 0
                    ) +
                    Number(
                      memberMeal.dinner || 0
                    );

                  return (
                    <tr
                      key={member.id}
                      className={
                        isCurrentMember
                          ? "current-member-row"
                          : ""
                      }
                    >
                      <td>
                        <div className="meal-member">
                          <div className="meal-avatar">
                            {member.name
                              ?.charAt(0)
                              .toUpperCase() || "M"}
                          </div>

                          <div>
                            <strong>
                              {member.name}
                            </strong>

                            <span>
                              {isCurrentMember
                                ? "Your meal"
                                : member.room
                                  ? `Room ${member.room}`
                                  : "Mess member"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {[
                        "breakfast",
                        "lunch",
                        "dinner",
                      ].map((mealType) => (
                        <td key={mealType}>
                          <div
                            className={`meal-counter ${
                              !canEdit
                                ? "read-only"
                                : ""
                            }`}
                          >
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMealChange(
                                    member.id,
                                    mealType,
                                    -0.5
                                  )
                                }
                                disabled={
                                  Number(
                                    memberMeal[
                                      mealType
                                    ] || 0
                                  ) <= 0
                                }
                                aria-label={`Decrease ${mealType}`}
                              >
                                <Minus size={15} />
                              </button>
                            )}

                            <strong>
                              {formatMealNumber(
                                memberMeal[
                                  mealType
                                ]
                              )}
                            </strong>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMealChange(
                                    member.id,
                                    mealType,
                                    0.5
                                  )
                                }
                                aria-label={`Increase ${mealType}`}
                              >
                                <Plus size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      ))}

                      <td>
                        <span className="meal-total-badge">
                          {formatMealNumber(
                            memberTotal
                          )}
                        </span>
                      </td>

                      <td>
                        {canEdit ? (
                          <span className="meal-access editable">
                            Editable
                          </span>
                        ) : (
                          <span className="meal-access locked">
                            <Lock size={13} />
                            Read only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="meal-sheet-footer">
          <div>
            <span>Selected date total meal</span>
            <strong>
              {formatMealNumber(dailyTotal)}
            </strong>
          </div>

          <button
            type="button"
            className="meal-save-button"
            onClick={handleSaveMeal}
            disabled={saving || !currentMember}
          >
            <Save size={18} />

            {saving
              ? "Saving..."
              : currentMember?.role === "manager"
                ? "Save Daily Meals"
                : "Save My Meal"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Meals;