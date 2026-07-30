import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  ExternalLink,
  Filter,
  History,
  Receipt,
  Search,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../../context/AuthContext";
import {
  deleteBazaarEntry,
  getWorkspaceData,
} from "../../services/dataService";

const getCurrentMonth = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
};

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const formatMoney = (value) => {
  return new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
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

const BazaarHistory = () => {
  const { user } = useContext(AuthContext);

  const [members, setMembers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());
  const [selectedMember, setSelectedMember] =
    useState("all");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] =
    useState(null);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
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
          "Unable to load bazaar history:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load bazaar history."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  const currentMember = useMemo(() => {
    if (!user) {
      return null;
    }

    return (
      members.find((member) => {
        if (member.userId && user.id) {
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

  const isManager =
    currentMember?.role === "manager";

  const filteredEntries = useMemo(() => {
    const query = normalizeText(searchText);

    return entries
      .filter((entry) => {
        const matchesMonth = selectedMonth
          ? entry.date?.startsWith(selectedMonth)
          : true;

        const matchesMember =
          selectedMember === "all"
            ? true
            : entry.memberId === selectedMember;

        const searchableText = [
          entry.memberName,
          ...(entry.items || []).flatMap(
            (item) => [
              item.itemName,
              item.category,
            ]
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = query
          ? searchableText.includes(query)
          : true;

        return (
          matchesMonth &&
          matchesMember &&
          matchesSearch
        );
      })
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
      });
  }, [
    entries,
    searchText,
    selectedMember,
    selectedMonth,
  ]);

  const totalAmount = useMemo(() => {
    return filteredEntries.reduce(
      (total, entry) =>
        total + Number(entry.grandTotal || 0),
      0
    );
  }, [filteredEntries]);

  const totalItems = useMemo(() => {
    return filteredEntries.reduce(
      (total, entry) =>
        total + (entry.items?.length || 0),
      0
    );
  }, [filteredEntries]);

  const handleDelete = async (entry) => {
    if (!isManager) {
      toast.error(
        "Only a manager can delete a bazaar entry."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${entry.memberName || "this member"}'s bazaar entry from ${formatDate(entry.date)}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(entry.id);

    try {
      await deleteBazaarEntry(
        entry.id,
        entry.receiptPath
      );

      setEntries((currentEntries) =>
        currentEntries.filter(
          (currentEntry) =>
            currentEntry.id !== entry.id
        )
      );

      toast.success(
        "Bazaar entry deleted successfully."
      );
    } catch (error) {
      console.error(
        "Unable to delete bazaar entry:",
        error
      );

      toast.error(
        error.message ||
          "Unable to delete bazaar entry."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSelectedMonth(getCurrentMonth());
    setSelectedMember("all");
    setSearchText("");
  };

  return (
    <div className="bazaar-history-page">
      <header className="bazaar-subpage-header">
        <div>
          <span className="bazaar-subpage-eyebrow">
            <History size={15} />
            Previous purchases
          </span>

          <h2>Bazaar History</h2>

          <p>
            Find bazaar entries by month, member or
            purchased item.
          </p>
        </div>

        <div className="bazaar-history-count">
          <ShoppingBasket size={17} />

          <span>
            {filteredEntries.length}{" "}
            {filteredEntries.length === 1
              ? "entry"
              : "entries"}
          </span>
        </div>
      </header>

      <section className="bazaar-filter-card">
        <div className="bazaar-filter-heading">
          <Filter size={18} />
          <span>Filter bazaar records</span>
        </div>

        <div className="bazaar-filter-grid">
          <label className="bazaar-filter-field">
            <span>Month</span>

            <div className="bazaar-filter-control">
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

          <label className="bazaar-filter-field">
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

          <label className="bazaar-filter-field">
            <span>Search</span>

            <div className="bazaar-filter-control">
              <Search size={17} />

              <input
                type="search"
                value={searchText}
                placeholder="Member, item or category"
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
            className="bazaar-reset-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>
      </section>

      <section className="bazaar-history-summary">
        <article>
          <span>Total entries</span>

          <strong>
            {filteredEntries.length}
          </strong>

          <small>Filtered bazaar records</small>
        </article>

        <article>
          <span>Total items</span>

          <strong>{totalItems}</strong>

          <small>Purchased item rows</small>
        </article>

        <article className="primary">
          <span>Total bazaar amount</span>

          <strong>
            ৳{formatMoney(totalAmount)}
          </strong>

          <small>For selected filters</small>
        </article>
      </section>

      <section className="bazaar-history-list">
        {loading ? (
          <div className="bazaar-empty-state">
            Loading bazaar history...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bazaar-empty-state">
            <ShoppingBasket size={32} />

            <strong>No bazaar records found</strong>

            <span>
              Change the filters or add a new bazaar
              entry.
            </span>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <article
              key={entry.id}
              className="bazaar-history-card"
            >
              <div className="bazaar-history-card-header">
                <div className="bazaar-history-member">
                  <div className="bazaar-history-avatar">
                    {entry.memberName
                      ?.charAt(0)
                      .toUpperCase() || "M"}
                  </div>

                  <div>
                    <h3>
                      {entry.memberName ||
                        "Unknown member"}
                    </h3>

                    <span>
                      <CalendarDays size={13} />
                      {formatDate(entry.date)}
                    </span>
                  </div>
                </div>

                <div className="bazaar-history-amount">
                  <span>Total amount</span>

                  <strong>
                    ৳{formatMoney(
                      entry.grandTotal
                    )}
                  </strong>
                </div>
              </div>

              <div className="bazaar-history-items">
                {(entry.items || []).length === 0 ? (
                  <div className="bazaar-no-items">
                    No item details available.
                  </div>
                ) : (
                  <div className="bazaar-item-table-wrapper">
                    <table className="bazaar-item-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Item</th>
                          <th>Quantity</th>
                          <th>Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {entry.items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <span className="bazaar-category-badge">
                                {item.category ||
                                  "Other"}
                              </span>
                            </td>

                            <td>
                              {item.itemName ||
                                "Unnamed item"}
                            </td>

                            <td>
                              {Number(
                                item.quantity
                              ) || 0}
                            </td>

                            <td>
                              <strong>
                                ৳
                                {formatMoney(
                                  item.amount
                                )}
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <footer className="bazaar-history-card-footer">
                <div>
                  {entry.receipt ? (
                    <a
                      href={entry.receipt}
                      target="_blank"
                      rel="noreferrer"
                      className="bazaar-receipt-link"
                    >
                      <Receipt size={16} />
                      View receipt
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span className="bazaar-no-receipt">
                      <Receipt size={15} />
                      No receipt
                    </span>
                  )}
                </div>

                {isManager && (
                  <button
                    type="button"
                    className="bazaar-delete-button"
                    disabled={
                      deletingId === entry.id
                    }
                    onClick={() =>
                      handleDelete(entry)
                    }
                  >
                    <Trash2 size={15} />

                    {deletingId === entry.id
                      ? "Deleting..."
                      : "Delete entry"}
                  </button>
                )}
              </footer>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default BazaarHistory;