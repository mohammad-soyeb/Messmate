import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarCheck,
  ChartNoAxesColumnIncreasing,
  PackageSearch,
  ShoppingBasket,
  TrendingUp,
  Users,
  WalletCards,
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

const formatMoney = (value) => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
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

const BazaarSummary = () => {
  const [members, setMembers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = getLocalDate();
  const currentMonth = today.substring(0, 7);
  const currentDay = Number(today.substring(8, 10));

  const totalDaysInMonth = new Date(
    Number(today.substring(0, 4)),
    Number(today.substring(5, 7)),
    0
  ).getDate();

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        setMembers(data.members || []);
        setEntries(data.bazaarEntries || []);
      } catch (error) {
        console.error(
          "Unable to load bazaar summary:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load bazaar summary."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      active = false;
    };
  }, []);

  const currentMonthEntries = useMemo(() => {
    return entries.filter((entry) => {
      return (
        entry.date?.startsWith(currentMonth) &&
        entry.date <= today
      );
    });
  }, [currentMonth, entries, today]);

  const summary = useMemo(() => {
    return currentMonthEntries.reduce(
      (result, entry) => {
        result.amount +=
          Number(entry.grandTotal) || 0;

        result.items +=
          entry.items?.length || 0;

        result.entryCount += 1;

        return result;
      },
      {
        amount: 0,
        items: 0,
        entryCount: 0,
      }
    );
  }, [currentMonthEntries]);

  const memberSummaries = useMemo(() => {
    return members
      .map((member) => {
        const memberEntries =
          currentMonthEntries.filter(
            (entry) =>
              entry.memberId === member.id
          );

        const memberAmount = memberEntries.reduce(
          (total, entry) =>
            total +
            (Number(entry.grandTotal) || 0),
          0
        );

        const itemCount = memberEntries.reduce(
          (total, entry) =>
            total +
            (entry.items?.length || 0),
          0
        );

        const bazaarDays = new Set(
          memberEntries.map((entry) => entry.date)
        ).size;

        const contribution =
          summary.amount > 0
            ? (memberAmount / summary.amount) *
              100
            : 0;

        return {
          ...member,
          amount: memberAmount,
          entryCount: memberEntries.length,
          itemCount,
          bazaarDays,
          contribution,
        };
      })
      .sort(
        (firstMember, secondMember) =>
          secondMember.amount -
          firstMember.amount
      );
  }, [
    currentMonthEntries,
    members,
    summary.amount,
  ]);

  const averagePerEntry =
    summary.entryCount > 0
      ? summary.amount / summary.entryCount
      : 0;

  return (
    <div className="bazaar-summary-page">
      <header className="bazaar-subpage-header">
        <div>
          <span className="bazaar-subpage-eyebrow">
            <ChartNoAxesColumnIncreasing
              size={15}
            />
            Current month overview
          </span>

          <h2>Monthly Bazaar Summary</h2>

          <p>
            {formatMonthName(today)} মাসের ১ তারিখ
            থেকে {formatFullDate(today)} পর্যন্ত
            member-wise বাজারের হিসাব।
          </p>
        </div>

        <div className="bazaar-summary-date">
          <CalendarCheck size={18} />

          <div>
            <span>Report until</span>

            <strong>
              {formatFullDate(today)}
            </strong>
          </div>
        </div>
      </header>

      <section className="bazaar-summary-cards">
        <article className="primary">
          <div className="bazaar-summary-card-icon">
            <WalletCards size={21} />
          </div>

          <div>
            <span>Total bazaar</span>

            <strong>
              ৳{formatMoney(summary.amount)}
            </strong>
          </div>
        </article>

        <article>
          <div className="bazaar-summary-card-icon entries">
            <ShoppingBasket size={21} />
          </div>

          <div>
            <span>Total entries</span>

            <strong>
              {summary.entryCount}
            </strong>
          </div>
        </article>

        <article>
          <div className="bazaar-summary-card-icon items">
            <PackageSearch size={21} />
          </div>

          <div>
            <span>Total item rows</span>

            <strong>{summary.items}</strong>
          </div>
        </article>

        <article>
          <div className="bazaar-summary-card-icon average">
            <TrendingUp size={21} />
          </div>

          <div>
            <span>Average per entry</span>

            <strong>
              ৳{formatMoney(averagePerEntry)}
            </strong>
          </div>
        </article>
      </section>

      <section className="bazaar-month-progress">
        <div className="bazaar-progress-heading">
          <div>
            <span>Current month progress</span>

            <strong>
              Day {currentDay} of{" "}
              {totalDaysInMonth}
            </strong>
          </div>

          <CalendarCheck size={22} />
        </div>

        <div className="bazaar-progress-track">
          <span
            style={{
              width: `${
                (currentDay /
                  totalDaysInMonth) *
                100
              }%`,
            }}
          />
        </div>

        <p>
          এই summary-তে ভবিষ্যতের কোনো তারিখের
          বাজার যুক্ত হবে না।
        </p>
      </section>

      <section className="bazaar-member-summary-card">
        <div className="bazaar-summary-table-heading">
          <div>
            <h3>Member-wise bazaar</h3>

            <p>
              কে কত টাকা এবং কয়দিন বাজার করেছে।
            </p>
          </div>

          <div className="bazaar-member-count">
            <Users size={17} />
            {members.length} members
          </div>
        </div>

        <div className="bazaar-summary-table-wrapper">
          <table className="bazaar-summary-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Total amount</th>
                <th>Entries</th>
                <th>Bazaar days</th>
                <th>Items</th>
                <th>Contribution</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="bazaar-empty-table"
                  >
                    Loading bazaar summary...
                  </td>
                </tr>
              ) : memberSummaries.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="bazaar-empty-table"
                  >
                    No members found.
                  </td>
                </tr>
              ) : (
                memberSummaries.map(
                  (member, index) => (
                    <tr key={member.id}>
                      <td>
                        <div className="bazaar-summary-member">
                          <span className="bazaar-summary-rank">
                            {index + 1}
                          </span>

                          <div className="bazaar-summary-avatar">
                            {member.name
                              ?.charAt(0)
                              .toUpperCase() || "M"}
                          </div>

                          <div>
                            <strong>
                              {member.name}
                            </strong>

                            <small>
                              {member.room
                                ? `Room ${member.room}`
                                : member.role ===
                                    "manager"
                                  ? "Manager"
                                  : "Mess member"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong className="bazaar-member-amount">
                          ৳
                          {formatMoney(
                            member.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        {member.entryCount}
                      </td>

                      <td>
                        {member.bazaarDays} days
                      </td>

                      <td>
                        {member.itemCount}
                      </td>

                      <td>
                        <div className="bazaar-contribution">
                          <div className="bazaar-contribution-track">
                            <span
                              style={{
                                width: `${Math.min(
                                  member.contribution,
                                  100
                                )}%`,
                              }}
                            />
                          </div>

                          <strong>
                            {member.contribution.toFixed(
                              1
                            )}
                            %
                          </strong>
                        </div>
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

export default BazaarSummary;