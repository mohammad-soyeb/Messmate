import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Plus,
  Scale,
  ShoppingBasket,
  Trash2,
  Utensils,
  Users,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  addMemberDeposit,
  carryForwardMemberBalances,
  deleteMemberFinancialEntry,
  getFinancialEntries,
  getWorkspaceData,
  setOpeningBalance,
} from "../../services/dataService";
import "../../styles/memberBalance.css";

const getCurrentMonth = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
};

const getNextMonth = (monthValue) => {
  const [year, month] = monthValue
    .split("-")
    .map(Number);

  const nextMonth = new Date(year, month, 1);

  return `${nextMonth.getFullYear()}-${String(
    nextMonth.getMonth() + 1
  ).padStart(2, "0")}`;
};

const normalizeText = (value = "") =>
  String(value).trim().toLowerCase();

const getFullMemberName = (member) => {
  const fullName =
    member?.fullName ||
    member?.full_name ||
    member?.name ||
    "";

  return String(fullName).trim() || "Member";
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

const getSignedClass = (value) => {
  if (value > 0.005) {
    return "positive";
  }

  if (value < -0.005) {
    return "negative";
  }

  return "neutral";
};

const SignedMoney = ({ value }) => {
  const amount = Number(value) || 0;

  return (
    <span className={`mb-balance ${getSignedClass(amount)}`}>
      {amount > 0.005 ? "+" : ""}
      {amount < -0.005 ? "−" : ""}৳
      {formatMoney(Math.abs(amount))}
    </span>
  );
};

const MemberBalance = () => {
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] =
    useState([]);
  const [financialEntries, setFinancialEntries] =
    useState([]);
  const [currentMember, setCurrentMember] =
    useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] =
    useState(false);
  const [entryForm, setEntryForm] = useState({
    memberId: "",
    type: "opening_balance",
    amount: "",
    date: `${getCurrentMonth()}-01`,
    note: "",
  });

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        const nextMembers = data.members || [];

        setMembers(nextMembers);
        setMeals(data.meals || []);
        setBazaarEntries(
          data.bazaarEntries || []
        );
        setFinancialEntries(
          data.financialEntries || []
        );
        setCurrentMember(data.member || null);
        setEntryForm((current) => ({
          ...current,
          memberId:
            current.memberId ||
            nextMembers[0]?.id ||
            "",
        }));
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to load member balance."
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

  useEffect(() => {
    setEntryForm((current) => ({
      ...current,
      date: `${selectedMonth}-01`,
    }));
  }, [selectedMonth]);

  const monthlyMeals = useMemo(
    () =>
      meals.filter((meal) =>
        meal.date?.startsWith(selectedMonth)
      ),
    [meals, selectedMonth]
  );

  const monthlyBazaar = useMemo(
    () =>
      bazaarEntries.filter((entry) =>
        entry.date?.startsWith(selectedMonth)
      ),
    [bazaarEntries, selectedMonth]
  );

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
      const fullName = getFullMemberName(member);

      memberMap.set(member.id, {
        id: member.id,
        name: fullName,
        displayName: fullName,
        role: member.role || "member",
        active: member.isActive !== false,
      });
    });

    [
      ...monthlyMeals,
      ...monthlyBazaar,
      ...monthlyFinancialEntries,
    ].forEach((record) => {
      const fullName =
        record.memberFullName ||
        record.memberName ||
        record.member ||
        "";
      const displayName =
        fullName || "Former member";
      const recordId =
        record.memberId ||
        `name-${normalizeText(displayName)}`;

      if (!recordId || recordId === "name-") {
        return;
      }

      if (!memberMap.has(recordId)) {
        memberMap.set(recordId, {
          id: recordId,
          name: fullName || displayName,
          displayName,
          role: "former",
          active: false,
        });
      }
    });

    return Array.from(memberMap.values()).sort(
      (a, b) =>
        a.displayName.localeCompare(b.displayName)
    );
  }, [
    members,
    monthlyMeals,
    monthlyBazaar,
    monthlyFinancialEntries,
  ]);

  const getRecordMemberId = (record) =>
    record.memberId ||
    `name-${normalizeText(
      record.memberFullName ||
        record.memberName ||
        record.member
    )}`;

  const totalMeals = useMemo(
    () =>
      monthlyMeals.reduce(
        (total, meal) =>
          total + getMealTotal(meal),
        0
      ),
    [monthlyMeals]
  );

  const totalBazaar = useMemo(
    () =>
      monthlyBazaar.reduce(
        (total, entry) =>
          total + getBazaarTotal(entry),
        0
      ),
    [monthlyBazaar]
  );

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
            getRecordMemberId(entry) === member.id &&
            isPersonalBazaarPayment(entry)
        )
        .reduce(
          (total, entry) =>
            total + getBazaarTotal(entry),
          0
        );

      const memberFinancialEntries =
        monthlyFinancialEntries.filter(
          (entry) => entry.memberId === member.id
        );

      const openingBalance =
        memberFinancialEntries
          .filter(
            (entry) =>
              entry.type === "opening_balance"
          )
          .reduce(
            (total, entry) =>
              total + Number(entry.amount || 0),
            0
          );

      const deposits = memberFinancialEntries
        .filter((entry) => entry.type === "deposit")
        .reduce(
          (total, entry) =>
            total + Number(entry.amount || 0),
          0
        );

      const mealBill = memberMeals * mealRate;
      const balance =
        openingBalance +
        deposits +
        bazaarPaid -
        mealBill;

      return {
        ...member,
        totalMeal: memberMeals,
        openingBalance,
        deposits,
        bazaarPaid,
        mealBill,
        balance,
      };
    });
  }, [
    reportMembers,
    monthlyMeals,
    monthlyBazaar,
    monthlyFinancialEntries,
    mealRate,
  ]);

  const totalOpening = useMemo(
    () =>
      memberBalances.reduce(
        (total, member) =>
          total + member.openingBalance,
        0
      ),
    [memberBalances]
  );

  const totalDeposits = useMemo(
    () =>
      memberBalances.reduce(
        (total, member) =>
          total + member.deposits,
        0
      ),
    [memberBalances]
  );

  const totalFinalBalance = useMemo(
    () =>
      memberBalances.reduce(
        (total, member) =>
          total + member.balance,
        0
      ),
    [memberBalances]
  );

  const totalReceivable = useMemo(
    () =>
      memberBalances.reduce(
        (total, member) =>
          member.balance > 0
            ? total + member.balance
            : total,
        0
      ),
    [memberBalances]
  );

  const totalPayable = useMemo(
    () =>
      memberBalances.reduce(
        (total, member) =>
          member.balance < 0
            ? total + Math.abs(member.balance)
            : total,
        0
      ),
    [memberBalances]
  );

  const isManager =
    currentMember?.role === "manager";

  const handleEntryChange = (event) => {
    const { name, value } = event.target;

    setEntryForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const refreshFinancialEntries = async () => {
    const entries = await getFinancialEntries();
    setFinancialEntries(entries);
  };

  const handleSaveEntry = async (event) => {
    event.preventDefault();

    if (!entryForm.memberId) {
      toast.error("Select a member.");
      return;
    }

    if (entryForm.amount === "") {
      toast.error("Enter an amount.");
      return;
    }

    if (
      entryForm.type === "deposit" &&
      !entryForm.date.startsWith(selectedMonth)
    ) {
      toast.error(
        "Deposit date must be inside the selected month."
      );
      return;
    }

    try {
      setSaving(true);

      if (entryForm.type === "opening_balance") {
        await setOpeningBalance({
          memberId: entryForm.memberId,
          month: selectedMonth,
          amount: entryForm.amount,
          note: entryForm.note,
        });

        toast.success("Opening balance saved.");
      } else {
        await addMemberDeposit({
          memberId: entryForm.memberId,
          date: entryForm.date,
          amount: entryForm.amount,
          note: entryForm.note,
        });

        toast.success("Advance deposit added.");
      }

      await refreshFinancialEntries();
      setEntryForm((current) => ({
        ...current,
        amount: "",
        note: "",
      }));
    } catch (error) {
      toast.error(
        error.message || "Unable to save entry."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    const label =
      entry.type === "opening_balance"
        ? "opening balance"
        : "deposit";

    if (
      !window.confirm(
        `Delete this ${label} entry?`
      )
    ) {
      return;
    }

    try {
      await deleteMemberFinancialEntry(entry.id);
      await refreshFinancialEntries();
      toast.success("Entry deleted.");
    } catch (error) {
      toast.error(
        error.message || "Unable to delete entry."
      );
    }
  };

  const handleCarryForward = async () => {
    const nextMonth = getNextMonth(selectedMonth);

    if (
      !window.confirm(
        `Transfer every current final balance to ${formatMonthName(
          nextMonth
        )} as opening balance? Existing opening balances for that month will be replaced.`
      )
    ) {
      return;
    }

    const activeMemberIds = new Set(
      members.map((member) => member.id)
    );

    const balances = memberBalances
      .filter((member) =>
        activeMemberIds.has(member.id)
      )
      .map((member) => ({
        memberId: member.id,
        amount: member.balance,
      }));

    try {
      setTransferring(true);

      await carryForwardMemberBalances({
        sourceMonth: selectedMonth,
        balances,
      });

      await refreshFinancialEntries();

      toast.success(
        `Balances transferred to ${formatMonthName(
          nextMonth
        )}.`
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to transfer balances."
      );
    } finally {
      setTransferring(false);
    }
  };

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
              Final settlement for{" "}
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

      {isManager && (
        <section className="mb-manager-panel">
          <header className="mb-manager-header">
            <div>
              <span className="mb-manager-icon">
                <Wallet size={18} />
              </span>
              <div>
                <h2>Opening & Advance</h2>
                <p>
                  Positive opening means credit;
                  negative means due.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="mb-transfer-button"
              onClick={handleCarryForward}
              disabled={transferring}
            >
              <ArrowRight size={16} />
              {transferring
                ? "Transferring..."
                : "Transfer to next month"}
            </button>
          </header>

          <form
            className="mb-entry-form"
            onSubmit={handleSaveEntry}
          >
            <label>
              <span>Member</span>
              <select
                name="memberId"
                value={entryForm.memberId}
                onChange={handleEntryChange}
              >
                {members.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {getFullMemberName(member)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Entry type</span>
              <select
                name="type"
                value={entryForm.type}
                onChange={handleEntryChange}
              >
                <option value="opening_balance">
                  Opening balance (+/−)
                </option>
                <option value="deposit">
                  Advance deposit
                </option>
              </select>
            </label>

            <label>
              <span>Amount</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min={
                  entryForm.type === "deposit"
                    ? "0.01"
                    : undefined
                }
                value={entryForm.amount}
                onChange={handleEntryChange}
                placeholder={
                  entryForm.type ===
                  "opening_balance"
                    ? "Example: -500 or 500"
                    : "Deposit amount"
                }
              />
            </label>

            {entryForm.type === "deposit" && (
              <label>
                <span>Deposit date</span>
                <input
                  name="date"
                  type="date"
                  value={entryForm.date}
                  onChange={handleEntryChange}
                  min={`${selectedMonth}-01`}
                />
              </label>
            )}

            <label className="mb-note-field">
              <span>Note (optional)</span>
              <input
                name="note"
                value={entryForm.note}
                onChange={handleEntryChange}
                placeholder="Short note"
                maxLength="160"
              />
            </label>

            <button
              type="submit"
              className="mb-save-entry-button"
              disabled={saving || !members.length}
            >
              <Plus size={16} />
              {saving ? "Saving..." : "Save entry"}
            </button>
          </form>

          {monthlyFinancialEntries.length > 0 && (
            <div className="mb-entry-list">
              {monthlyFinancialEntries.map((entry) => (
                <article key={entry.id}>
                  <div>
                    <strong>
                      {entry.memberName || "Member"}
                    </strong>
                    <span>
                      {entry.type ===
                      "opening_balance"
                        ? "Opening balance"
                        : `Deposit • ${entry.date}`}
                      {entry.note
                        ? ` • ${entry.note}`
                        : ""}
                    </span>
                  </div>

                  <SignedMoney value={entry.amount} />

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteEntry(entry)
                    }
                    aria-label="Delete entry"
                    title="Delete entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mb-table-card">
        <header className="mb-table-header">
          <div>
            <h2>Final Member-wise Settlement</h2>
            <p>
              Opening + deposit + bazaar − meal bill.
            </p>
          </div>
          <span className="mb-member-count">
            {memberBalances.length} members
          </span>
        </header>

        <div className="mb-table-wrapper">
          <table className="mb-settlement-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Opening</th>
                <th>Deposit</th>
                <th>Meal</th>
                <th>Bazaar</th>
                <th>Bill</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {memberBalances.length === 0 ? (
                <tr>
                  <td colSpan="7" className="mb-empty">
                    No member balance found for this
                    month.
                  </td>
                </tr>
              ) : (
                memberBalances.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="mb-member-cell">
                        <div
                          className="mb-member-avatar"
                          title={member.name}
                        >
                          {member.displayName
                            ?.charAt(0)
                            .toUpperCase() || "M"}
                        </div>
                        <div className="mb-member-details">
                          <strong
                            className="mb-settlement-member-name"
                            title={member.name}
                          >
                            {member.name}
                          </strong>
                          {!member.active && (
                            <small>Former member</small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <SignedMoney
                        value={member.openingBalance}
                      />
                    </td>
                    <td>
                      ৳{formatMoney(member.deposits)}
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
                      <SignedMoney
                        value={member.balance}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {memberBalances.length > 0 && (
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th>
                    <SignedMoney value={totalOpening} />
                  </th>
                  <th>৳{formatMoney(totalDeposits)}</th>
                  <th>{formatMeal(totalMeals)}</th>
                  <th>৳{formatMoney(totalBazaar)}</th>
                  <th>৳{formatMoney(totalBazaar)}</th>
                  <th>
                    <SignedMoney
                      value={totalFinalBalance}
                    />
                  </th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="mb-final-summary">
        <article>
          <span>Total advance deposit</span>
          <strong>৳{formatMoney(totalDeposits)}</strong>
        </article>
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
      </section>
    </div>
  );
};

export default MemberBalance;