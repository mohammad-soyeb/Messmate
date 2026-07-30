import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Image,
  Plus,
  Receipt,
  Save,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../context/AuthContext";
import {
  createBazaarEntry,
  deleteBazaarEntry as removeBazaarEntry,
  getWorkspaceData,
} from "../services/dataService";
import "../styles/bazaar.css";

const CATEGORIES = [
  "Grocery",
  "Vegetable",
  "Meat",
  "Fish",
  "Egg",
  "Dairy",
  "Fruit",
  "Snacks",
  "Others",
];

const ITEM_SUGGESTIONS = [
  "Rice",
  "Chicken",
  "Beef",
  "Fish",
  "Egg",
  "Potato",
  "Onion",
  "Garlic",
  "Ginger",
  "Oil",
  "Salt",
  "Sugar",
  "Milk",
  "Lentil",
  "Vegetables",
];

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const createId = (prefix = "id") => {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
};

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const formatQuantity = (quantity) => {
  const value = Number(quantity) || 0;

  return Number.isInteger(value)
    ? value
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
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

const createEmptyItem = () => {
  return {
    id: createId("item"),
    category: "Grocery",
    itemName: "",
    quantity: "",
    amount: "",
  };
};

const Bazaar = () => {
  const { user } = useContext(AuthContext);

  const [members, setMembers] = useState([]);
  const [bazaarEntries, setBazaarEntries] =
    useState([]);

  const [bazaarDate, setBazaarDate] =
    useState(getTodayDate());

  const [items, setItems] = useState([
    createEmptyItem(),
  ]);

  const [receiptData, setReceiptData] =
    useState(null);
  const [receiptFile, setReceiptFile] =
    useState(null);

  const [receiptName, setReceiptName] =
    useState("");

  const [saving, setSaving] = useState(false);

  const [expandedEntryId, setExpandedEntryId] =
    useState(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const data = await getWorkspaceData();

        if (active) {
          setMembers(data.members);
          setBazaarEntries(
            data.bazaarEntries
          );
        }
      } catch (error) {
        console.error(
          "Unable to load bazaar:",
          error
        );
        toast.error(
          error.message ||
            "Unable to load bazaar records."
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

  /*
   * Quantity দিয়ে Amount calculate হবে না।
   * User যে Amount লিখবে, সেটাই যোগ হবে।
   */
  const grandTotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );
  }, [items]);

  const monthlyTotal = useMemo(() => {
    const selectedMonth =
      bazaarDate.substring(0, 7);

    return bazaarEntries
      .filter((entry) =>
        entry.date?.startsWith(selectedMonth)
      )
      .reduce(
        (total, entry) =>
          total +
          Number(entry.grandTotal || 0),
        0
      );
  }, [bazaarEntries, bazaarDate]);

  const todayTotal = useMemo(() => {
    return bazaarEntries
      .filter(
        (entry) => entry.date === getTodayDate()
      )
      .reduce(
        (total, entry) =>
          total +
          Number(entry.grandTotal || 0),
        0
      );
  }, [bazaarEntries]);

  const totalItemsPurchased = useMemo(() => {
    return bazaarEntries.reduce(
      (total, entry) =>
        total +
        (Array.isArray(entry.items)
          ? entry.items.length
          : 0),
      0
    );
  }, [bazaarEntries]);

  const sortedEntries = useMemo(() => {
    return [...bazaarEntries].sort((a, b) => {
      const dateDifference =
        new Date(b.date) - new Date(a.date);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return (
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );
    });
  }, [bazaarEntries]);

  const handleItemChange = (
    itemId,
    field,
    value
  ) => {
    setItems((previousItems) =>
      previousItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItemRow = () => {
    setItems((previousItems) => [
      ...previousItems,
      createEmptyItem(),
    ]);
  };

  const removeItemRow = (itemId) => {
    if (items.length === 1) {
      toast.error(
        "At least one item row is required."
      );
      return;
    }

    setItems((previousItems) =>
      previousItems.filter(
        (item) => item.id !== itemId
      )
    );
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(
        "Please select an image file."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(
        "Receipt image must be smaller than 2 MB."
      );

      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setReceiptData(reader.result);
      setReceiptFile(file);
      setReceiptName(file.name);
    };

    reader.onerror = () => {
      toast.error(
        "Unable to read the receipt image."
      );
    };

    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptData(null);
    setReceiptFile(null);
    setReceiptName("");

    const receiptInput =
      document.getElementById(
        "bazaarReceiptInput"
      );

    if (receiptInput) {
      receiptInput.value = "";
    }
  };

  const validateItems = () => {
    const incompleteItem = items.find(
      (item) =>
        !item.itemName.trim() ||
        Number(item.quantity) <= 0 ||
        Number(item.amount) <= 0
    );

    if (incompleteItem) {
      toast.error(
        "Complete every item name, quantity and amount."
      );

      return false;
    }

    if (grandTotal <= 0) {
      toast.error(
        "Grand total must be greater than zero."
      );

      return false;
    }

    return true;
  };

  const resetForm = () => {
    setBazaarDate(getTodayDate());
    setItems([createEmptyItem()]);
    setReceiptData(null);
    setReceiptFile(null);
    setReceiptName("");

    const receiptInput =
      document.getElementById(
        "bazaarReceiptInput"
      );

    if (receiptInput) {
      receiptInput.value = "";
    }
  };

  const handleSaveBazaar = async (event) => {
    event.preventDefault();

    if (!currentMember) {
      toast.error(
        "Your member profile could not be found."
      );

      return;
    }

    if (!bazaarDate) {
      toast.error(
        "Please select a bazaar date."
      );

      return;
    }

    if (!validateItems()) {
      return;
    }

    const existingSameDayEntry =
      bazaarEntries.some(
        (entry) =>
          entry.memberId === currentMember.id &&
          entry.date === bazaarDate
      );

    if (existingSameDayEntry) {
      const shouldContinue = window.confirm(
        "You already have a bazaar entry on this date. Do you want to create another entry?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    setSaving(true);

    try {
      const normalizedItems = items.map(
        (item) => ({
          id: item.id,
          category: item.category,
          itemName: item.itemName.trim(),
          quantity:
            Number(item.quantity) || 0,
          unit: "Kg",
          amount:
            Number(item.amount) || 0,
        })
      );

      const newEntry = await createBazaarEntry({
        date: bazaarDate,
        memberId: currentMember.id,
        items: normalizedItems,
        receiptFile,
      });

      setBazaarEntries((currentEntries) => [
        ...currentEntries,
        newEntry,
      ]);
      resetForm();

      toast.success(
        "Bazaar entry saved successfully."
      );
    } catch (error) {
      console.error(
        "Bazaar save error:",
        error
      );

      toast.error(
        "Unable to save the bazaar entry."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteBazaarEntry = async (entryId) => {
    const selectedEntry =
      bazaarEntries.find(
        (entry) => entry.id === entryId
      );

    if (!selectedEntry) {
      return;
    }

    const canDelete =
      selectedEntry.memberId ===
        currentMember?.id ||
      currentMember?.role === "manager";

    if (!canDelete) {
      toast.error(
        "You cannot delete another member's bazaar entry."
      );

      return;
    }

    const shouldDelete = window.confirm(
      "Are you sure you want to delete this bazaar entry?"
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await removeBazaarEntry(
        entryId,
        selectedEntry.receiptPath
      );
      setBazaarEntries((currentEntries) =>
        currentEntries.filter(
          (entry) => entry.id !== entryId
        )
      );

      if (expandedEntryId === entryId) {
        setExpandedEntryId(null);
      }

      toast.success("Bazaar entry deleted.");
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to delete bazaar entry."
      );
    }
  };

  const toggleEntryDetails = (entryId) => {
    setExpandedEntryId((currentId) =>
      currentId === entryId
        ? null
        : entryId
    );
  };

  return (
    <div className="page-container bazaar-page">
      <div className="bazaar-page-header">
        <div>
          <div className="bazaar-heading-icon">
            <ShoppingBasket size={25} />
          </div>

          <div>
            <h1>Bazaar Management</h1>

            <p>
              Add bazaar items, quantities and
              total amounts.
            </p>
          </div>
        </div>

        <div className="bazaar-current-member">
          <span>Bazaar by</span>

          <strong>
            {currentMember?.name ||
              user?.name ||
              "Unknown Member"}
          </strong>
        </div>
      </div>

      <div className="bazaar-summary-grid">
        <div className="bazaar-stat-card">
          <span>Today&apos;s bazaar</span>

          <strong>
            ৳ {formatMoney(todayTotal)}
          </strong>

          <small>All entries made today</small>
        </div>

        <div className="bazaar-stat-card">
          <span>Monthly bazaar</span>

          <strong>
            ৳ {formatMoney(monthlyTotal)}
          </strong>

          <small>Selected month total</small>
        </div>

        <div className="bazaar-stat-card">
          <span>Total entries</span>

          <strong>
            {bazaarEntries.length}
          </strong>

          <small>Saved bazaar records</small>
        </div>

        <div className="bazaar-stat-card">
          <span>Total items</span>

          <strong>{totalItemsPurchased}</strong>

          <small>Items in all records</small>
        </div>
      </div>

      {!currentMember && (
        <div className="bazaar-warning">
          Your login account is not connected to
          a member profile. Add the same name or
          email in the Members page.
        </div>
      )}

      <form
        className="bazaar-entry-card"
        onSubmit={handleSaveBazaar}
      >
        <div className="bazaar-card-header">
          <div>
            <h2>New Bazaar Entry</h2>

            <p>
              Enter the purchased quantity and
              total amount manually.
            </p>
          </div>

          <div className="bazaar-date-field">
            <label htmlFor="bazaarDate">
              <CalendarDays size={16} />
              Bazaar date
            </label>

            <input
              id="bazaarDate"
              type="date"
              value={bazaarDate}
              onChange={(event) =>
                setBazaarDate(
                  event.target.value
                )
              }
              required
            />
          </div>
        </div>

        <div className="bazaar-items-table-wrapper">
          <table className="bazaar-items-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item name</th>
                <th>Quantity (Kg)</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td data-label="Category">
                    <select
                      value={item.category}
                      onChange={(event) =>
                        handleItemChange(
                          item.id,
                          "category",
                          event.target.value
                        )
                      }
                    >
                      {CATEGORIES.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  <td data-label="Item name">
                    <input
                      type="text"
                      list={`itemSuggestions-${index}`}
                      placeholder="Example: Rice"
                      value={item.itemName}
                      onChange={(event) =>
                        handleItemChange(
                          item.id,
                          "itemName",
                          event.target.value
                        )
                      }
                      required
                    />

                    <datalist
                      id={`itemSuggestions-${index}`}
                    >
                      {ITEM_SUGGESTIONS.map(
                        (suggestion) => (
                          <option
                            key={suggestion}
                            value={suggestion}
                          />
                        )
                      )}
                    </datalist>
                  </td>

                  <td data-label="Quantity (Kg)">
                    <div className="bazaar-quantity-input">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemChange(
                            item.id,
                            "quantity",
                            event.target.value
                          )
                        }
                        required
                      />

                      <span>Kg</span>
                    </div>
                  </td>

                  <td data-label="Amount">
                    <div className="bazaar-money-input">
                      <span>৳</span>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0"
                        value={item.amount}
                        onChange={(event) =>
                          handleItemChange(
                            item.id,
                            "amount",
                            event.target.value
                          )
                        }
                        required
                      />
                    </div>
                  </td>

                  <td data-label="Action">
                    <button
                      type="button"
                      className="bazaar-remove-row-button"
                      onClick={() =>
                        removeItemRow(item.id)
                      }
                      aria-label="Remove item"
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="bazaar-add-item-button"
          onClick={addItemRow}
        >
          <Plus size={18} />
          Add Another Item
        </button>

        <div className="bazaar-entry-bottom">
          <div className="bazaar-receipt-section">
            <div className="bazaar-receipt-heading">
              <Receipt size={19} />

              <div>
                <strong>Receipt image</strong>
                <span>Optional</span>
              </div>
            </div>

            {!receiptData ? (
              <label
                htmlFor="bazaarReceiptInput"
                className="bazaar-receipt-upload"
              >
                <Image size={19} />
                Choose Receipt Image

                <input
                  id="bazaarReceiptInput"
                  type="file"
                  accept="image/*"
                  onChange={
                    handleReceiptChange
                  }
                />
              </label>
            ) : (
              <div className="bazaar-receipt-preview">
                <img
                  src={receiptData}
                  alt="Receipt preview"
                />

                <div>
                  <strong>{receiptName}</strong>

                  <button
                    type="button"
                    onClick={removeReceipt}
                  >
                    <X size={15} />
                    Remove
                  </button>
                </div>
              </div>
            )}

            <small>
              Maximum image size: 2 MB
            </small>
          </div>

          <div className="bazaar-total-section">
            <div>
              <span>Total item rows</span>

              <strong>{items.length}</strong>
            </div>

            <div className="bazaar-grand-total">
              <span>Grand total</span>

              <strong>
                ৳ {formatMoney(grandTotal)}
              </strong>
            </div>

            <button
              type="submit"
              className="bazaar-save-button"
              disabled={
                saving || !currentMember
              }
            >
              <Save size={18} />

              {saving
                ? "Saving..."
                : "Save Bazaar"}
            </button>
          </div>
        </div>
      </form>

      <section className="bazaar-history-card">
        <div className="bazaar-history-header">
          <div>
            <h2>Bazaar History</h2>

            <p>
              View saved bazaar records and
              item details.
            </p>
          </div>

          <span>
            {bazaarEntries.length}{" "}
            {bazaarEntries.length === 1
              ? "entry"
              : "entries"}
          </span>
        </div>

        <div className="bazaar-history-list">
          {sortedEntries.length === 0 ? (
            <div className="bazaar-empty-state">
              <ShoppingBasket size={42} />

              <h3>
                No Bazaar Records Found
              </h3>

              <p>
                Your saved bazaar entries will
                appear here.
              </p>
            </div>
          ) : (
            sortedEntries.map((entry) => {
              const isExpanded =
                expandedEntryId === entry.id;

              const canDelete =
                entry.memberId ===
                  currentMember?.id ||
                currentMember?.role ===
                  "manager";

              return (
                <article
                  className="bazaar-history-entry"
                  key={entry.id}
                >
                  <div className="bazaar-history-summary">
                    <div className="bazaar-history-date">
                      <CalendarDays size={19} />

                      <div>
                        <strong>
                          {formatDate(entry.date)}
                        </strong>

                        <span>
                          {entry.memberName}
                        </span>
                      </div>
                    </div>

                    <div className="bazaar-history-meta">
                      <span>
                        {entry.items?.length || 0}{" "}
                        items
                      </span>

                      {entry.receipt && (
                        <span>
                          Receipt attached
                        </span>
                      )}
                    </div>

                    <strong className="bazaar-history-total">
                      ৳{" "}
                      {formatMoney(
                        entry.grandTotal
                      )}
                    </strong>

                    <div className="bazaar-history-actions">
                      <button
                        type="button"
                        className="bazaar-details-button"
                        onClick={() =>
                          toggleEntryDetails(
                            entry.id
                          )
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp size={17} />
                        ) : (
                          <ChevronDown size={17} />
                        )}

                        {isExpanded
                          ? "Hide"
                          : "Details"}
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          className="bazaar-delete-entry-button"
                          onClick={() =>
                            deleteBazaarEntry(
                              entry.id
                            )
                          }
                          aria-label="Delete bazaar entry"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bazaar-history-details">
                      <div className="bazaar-details-table-wrapper">
                        <table className="bazaar-details-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Item</th>
                              <th>
                                Quantity
                              </th>
                              <th>Amount</th>
                            </tr>
                          </thead>

                          <tbody>
                            {entry.items?.map(
                              (item) => (
                                <tr key={item.id}>
                                  <td>
                                    {item.category}
                                  </td>

                                  <td>
                                    {item.itemName}
                                  </td>

                                  <td>
                                    {formatQuantity(
                                      item.quantity
                                    )}{" "}
                                    Kg
                                  </td>

                                  <td>
                                    <strong>
                                      ৳{" "}
                                      {formatMoney(
                                        item.amount
                                      )}
                                    </strong>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>

                      {entry.receipt && (
                        <div className="bazaar-saved-receipt">
                          <span>Receipt</span>

                          <img
                            src={entry.receipt}
                            alt="Saved bazaar receipt"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default Bazaar;
