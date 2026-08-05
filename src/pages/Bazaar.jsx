import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  ImagePlus,
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

const createId = () => {
  return `item_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
};

const createEmptyItem = () => ({
  id: createId(),
  category: "Grocery",
  itemName: "",
  quantity: "",
  amount: "",
});

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const formatMoney = (value) => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const formatDate = (dateString) => {
  if (!dateString) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
};

const Bazaar = () => {
  const { user } = useContext(AuthContext);

  const [members, setMembers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedMemberId, setSelectedMemberId] =
    useState("");
  const [bazaarDate, setBazaarDate] =
    useState(getTodayDate());
  const [items, setItems] = useState([
    createEmptyItem(),
  ]);
  const [receiptFile, setReceiptFile] =
    useState(null);
  const [receiptPreview, setReceiptPreview] =
    useState("");
  const [receiptName, setReceiptName] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
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
          "Unable to load bazaar data:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load bazaar data."
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

  const selectedMember = useMemo(() => {
    if (!isManager) {
      return currentMember;
    }

    return (
      members.find(
        (member) =>
          member.id === selectedMemberId
      ) || currentMember
    );
  }, [
    currentMember,
    isManager,
    members,
    selectedMemberId,
  ]);

  useEffect(() => {
    if (!currentMember) {
      return;
    }

    setSelectedMemberId((currentId) => {
      const selectedMemberStillExists =
        members.some(
          (member) => member.id === currentId
        );

      if (
        isManager &&
        currentId &&
        selectedMemberStillExists
      ) {
        return currentId;
      }

      return currentMember.id;
    });
  }, [currentMember, isManager, members]);

  const grandTotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + (Number(item.amount) || 0),
      0
    );
  }, [items]);

  const validItemCount = useMemo(() => {
    return items.filter(
      (item) =>
        item.itemName.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.amount) > 0
    ).length;
  }, [items]);

  const updateItem = (
    itemId,
    field,
    value
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyItem(),
    ]);
  };

  const removeItem = (itemId) => {
    if (items.length === 1) {
      toast.error(
        "At least one item is required."
      );
      return;
    }

    setItems((currentItems) =>
      currentItems.filter(
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
        "Receipt must be an image file."
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

    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(file);
    setReceiptName(file.name);
    setReceiptPreview(
      URL.createObjectURL(file)
    );
  };

  const removeReceipt = () => {
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(null);
    setReceiptPreview("");
    setReceiptName("");

    const input = document.getElementById(
      "bazaarReceiptInput"
    );

    if (input) {
      input.value = "";
    }
  };

  const resetForm = () => {
    setBazaarDate(getTodayDate());
    setItems([createEmptyItem()]);
    removeReceipt();
  };

  const validateForm = () => {
    if (!currentMember) {
      toast.error(
        "Your account is not connected to a member."
      );
      return false;
    }

    if (!selectedMember) {
      toast.error(
        "Please select a member for this bazaar entry."
      );
      return false;
    }

    if (!bazaarDate) {
      toast.error(
        "Please select a bazaar date."
      );
      return false;
    }

    const invalidItem = items.find(
      (item) =>
        !item.itemName.trim() ||
        Number(item.quantity) <= 0 ||
        Number(item.amount) <= 0
    );

    if (invalidItem) {
      toast.error(
        "Complete every item name, quantity and amount."
      );
      return false;
    }

    if (grandTotal <= 0) {
      toast.error(
        "Total amount must be greater than zero."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const sameDayEntryExists = entries.some(
      (entry) =>
        entry.memberId === selectedMember.id &&
        entry.date === bazaarDate
    );

    if (sameDayEntryExists) {
      const confirmed = window.confirm(
        `${selectedMember.name} already has a bazaar entry on this date. Do you want to add another one?`
      );

      if (!confirmed) {
        return;
      }
    }

    setSaving(true);

    try {
      const normalizedItems = items.map(
        (item) => ({
          category: item.category,
          itemName: item.itemName.trim(),
          quantity:
            Number(item.quantity) || 0,
          amount: Number(item.amount) || 0,
        })
      );

      const savedEntry =
        await createBazaarEntry({
          date: bazaarDate,
          memberId: selectedMember.id,
          items: normalizedItems,
          receiptFile,
        });

      if (savedEntry) {
        setEntries((currentEntries) => [
          savedEntry,
          ...currentEntries,
        ]);
      }

      resetForm();

      toast.success(
        "Bazaar entry saved successfully."
      );
    } catch (error) {
      console.error(
        "Unable to save bazaar entry:",
        error
      );

      toast.error(
        error.message ||
          "Unable to save the bazaar entry."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bazaar-add-page">
      <header className="bazaar-subpage-header">
        <div>
          <span className="bazaar-subpage-eyebrow">
            <ShoppingBasket size={15} />
            New purchase
          </span>

          <h2>Add Bazaar</h2>

          <p>
            Add purchased items, their total amounts
            and an optional receipt.
          </p>
        </div>

        <div className="bazaar-current-member">
          <div className="bazaar-current-avatar">
            {selectedMember?.name
              ?.charAt(0)
              .toUpperCase() || "M"}
          </div>

          <div>
            <span>
              {isManager
                ? "Adding bazaar for"
                : "Adding as"}
            </span>

            <strong>
              {loading
                ? "Loading..."
                : selectedMember?.name ||
                  "Member not connected"}
            </strong>
          </div>
        </div>
      </header>

      {!currentMember && !loading && (
        <div className="bazaar-warning">
          Your login account is not connected to an
          active member profile. Ask the manager to
          connect your account.
        </div>
      )}

      <form
        className="bazaar-entry-form"
        onSubmit={handleSubmit}
      >
        <section className="bazaar-form-card">
          <div className="bazaar-form-heading">
            <div>
              <h3>Bazaar information</h3>

              <p>
                Select the purchase date and add all
                purchased items.
              </p>
            </div>

            <div className="bazaar-selected-date">
              <CalendarDays size={17} />

              <span>
                {formatDate(bazaarDate)}
              </span>
            </div>
          </div>

          <div className="bazaar-date-field">
            <label htmlFor="bazaarDate">
              Bazaar date
            </label>

            <div>
              <CalendarDays size={18} />

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

          {isManager && (
            <div className="bazaar-date-field bazaar-member-field">
              <label htmlFor="bazaarMember">
                Add bazaar for member
              </label>

              <div>
                <ShoppingBasket size={18} />

                <select
                  id="bazaarMember"
                  value={selectedMemberId}
                  onChange={(event) =>
                    setSelectedMemberId(
                      event.target.value
                    )
                  }
                  required
                >
                  {members.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.name}
                      {member.room
                        ? ` — Room ${member.room}`
                        : ""}
                      {member.role === "manager"
                        ? " (Manager)"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="bazaar-form-card">
          <div className="bazaar-form-heading">
            <div>
              <h3>Purchased items</h3>

              <p>
                Enter the amount paid for each item.
              </p>
            </div>

            <span className="bazaar-item-count">
              {items.length}{" "}
              {items.length === 1
                ? "item"
                : "items"}
            </span>
          </div>

          <div className="bazaar-entry-table-wrapper">
            <table className="bazaar-entry-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item name</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th aria-label="Remove item" />
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td data-label="Category">
                      <select
                        value={item.category}
                        onChange={(event) =>
                          updateItem(
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
                        list="bazaarItemSuggestions"
                        value={item.itemName}
                        placeholder={`Item ${index + 1}`}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            "itemName",
                            event.target.value
                          )
                        }
                        required
                      />
                    </td>

                    <td data-label="Quantity">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        placeholder="0"
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            "quantity",
                            event.target.value
                          )
                        }
                        required
                      />
                    </td>

                    <td data-label="Amount">
                      <div className="bazaar-money-input">
                        <span>৳</span>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.amount}
                          placeholder="0"
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "amount",
                              event.target.value
                            )
                          }
                          required
                        />
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="bazaar-remove-item"
                        onClick={() =>
                          removeItem(item.id)
                        }
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <datalist id="bazaarItemSuggestions">
              {ITEM_SUGGESTIONS.map((item) => (
                <option
                  key={item}
                  value={item}
                />
              ))}
            </datalist>
          </div>

          <div className="bazaar-items-footer">
            <button
              type="button"
              className="bazaar-add-item-button"
              onClick={addItem}
            >
              <Plus size={17} />
              Add another item
            </button>

            <div className="bazaar-form-total">
              <span>Grand total</span>

              <strong>
                ৳{formatMoney(grandTotal)}
              </strong>
            </div>
          </div>
        </section>

        <section className="bazaar-form-card">
          <div className="bazaar-form-heading">
            <div>
              <h3>Receipt</h3>

              <p>
                Upload an optional receipt image,
                maximum 2 MB.
              </p>
            </div>

            <Receipt size={21} />
          </div>

          {!receiptPreview ? (
            <label
              className="bazaar-receipt-upload"
              htmlFor="bazaarReceiptInput"
            >
              <div>
                <ImagePlus size={28} />
              </div>

              <strong>Upload receipt image</strong>

              <span>
                JPG, PNG or WEBP — maximum 2 MB
              </span>

              <input
                id="bazaarReceiptInput"
                type="file"
                accept="image/*"
                onChange={handleReceiptChange}
              />
            </label>
          ) : (
            <div className="bazaar-receipt-preview">
              <img
                src={receiptPreview}
                alt="Receipt preview"
              />

              <div>
                <strong>{receiptName}</strong>

                <span>
                  Receipt is ready to upload.
                </span>
              </div>

              <button
                type="button"
                onClick={removeReceipt}
                aria-label="Remove receipt"
              >
                <X size={17} />
              </button>
            </div>
          )}
        </section>

        <section className="bazaar-submit-card">
          <div>
            <span>Ready to save</span>

            <strong>
              {validItemCount} items · ৳
              {formatMoney(grandTotal)}
            </strong>
          </div>

          <button
            type="submit"
            className="bazaar-save-button"
            disabled={
              saving ||
              loading ||
              !selectedMember
            }
          >
            <Save size={18} />

            {saving
              ? "Saving Bazaar..."
              : "Save Bazaar Entry"}
          </button>
        </section>
      </form>
    </div>
  );
};

export default Bazaar;