import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CalendarDays,
  Download,
  Printer,
  ReceiptText,
} from "lucide-react";
import toast from "react-hot-toast";

import { getWorkspaceData } from "../../services/dataService";
import "../../styles/exportReport.css";

const getCurrentMonth = () =>
  new Date().toISOString().slice(0, 7);

const normalizeText = (value = "") =>
  String(value).trim().toLowerCase();

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

const formatMeal = (value) => {
  const amount = Number(value) || 0;

  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatMonthName = (monthValue) => {
  if (!monthValue) return "";

  const [year, month] = monthValue.split("-");

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
};

const getMonthDates = (monthValue) => {
  if (!monthValue) return [];

  const [year, month] = monthValue
    .split("-")
    .map(Number);

  const totalDays = new Date(year, month, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;

    const date = `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    const dateObject = new Date(year, month - 1, day);

    return {
      date,
      day,
      weekday: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
      }).format(dateObject),
    };
  });
};

const getDisplayName = (fullName = "") => {
  const cleanName = String(fullName).trim();

  if (cleanName.length <= 12) {
    return cleanName || "Member";
  }

  const nameParts = cleanName.split(/\s+/);

  return nameParts[nameParts.length - 1] || "Member";
};

const ExportReport = () => {
  const reportRef = useRef(null);

  const [selectedMonth, setSelectedMonth] = useState(
    getCurrentMonth()
  );

  const [mess, setMess] = useState(null);
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      try {
        setLoading(true);

        const data = await getWorkspaceData();

        if (!active) return;

        setMess(data.mess || null);
        setMembers(data.members || []);
        setMeals(data.meals || []);
        setBazaarEntries(data.bazaarEntries || []);
      } catch (error) {
        toast.error(
          error.message || "Unable to load export report."
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

  const monthlyMeals = useMemo(() => {
    return meals.filter((meal) =>
      meal.date?.startsWith(selectedMonth)
    );
  }, [meals, selectedMonth]);

  const monthlyBazaar = useMemo(() => {
    return bazaarEntries.filter((entry) =>
      entry.date?.startsWith(selectedMonth)
    );
  }, [bazaarEntries, selectedMonth]);

  const reportMembers = useMemo(() => {
    const memberMap = new Map();

    members.forEach((member) => {
      memberMap.set(member.id, {
        id: member.id,
        name: member.name || "Member",
        active: member.isActive !== false,
      });
    });

    [...monthlyMeals, ...monthlyBazaar].forEach(
      (record) => {
        const memberName =
          record.memberName || record.member || "";

        const memberId =
          record.memberId ||
          `name-${normalizeText(memberName)}`;

        if (!memberId || memberId === "name-") return;

        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            id: memberId,
            name: memberName || "Former member",
            active: false,
          });
        }
      }
    );

    return Array.from(memberMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [members, monthlyMeals, monthlyBazaar]);

  const monthDates = useMemo(
    () => getMonthDates(selectedMonth),
    [selectedMonth]
  );

  const getRecordMemberId = (record) => {
    return (
      record.memberId ||
      `name-${normalizeText(
        record.memberName || record.member
      )}`
    );
  };

  const mealMatrix = useMemo(() => {
    const matrix = new Map();

    monthlyMeals.forEach((meal) => {
      const memberId = getRecordMemberId(meal);
      const key = `${meal.date}-${memberId}`;

      matrix.set(
        key,
        (matrix.get(key) || 0) + getMealTotal(meal)
      );
    });

    return matrix;
  }, [monthlyMeals]);

  const totalMeals = useMemo(() => {
    return monthlyMeals.reduce(
      (total, meal) => total + getMealTotal(meal),
      0
    );
  }, [monthlyMeals]);

  const totalBazaar = useMemo(() => {
    return monthlyBazaar.reduce(
      (total, entry) =>
        total + getBazaarTotal(entry),
      0
    );
  }, [monthlyBazaar]);

  const mealRate =
    totalMeals > 0 ? totalBazaar / totalMeals : 0;

  const settlementRows = useMemo(() => {
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
            getRecordMemberId(entry) === member.id
        )
        .reduce(
          (total, entry) =>
            total + getBazaarTotal(entry),
          0
        );

      const mealBill = memberMeals * mealRate;
      const balance = bazaarPaid - mealBill;

      return {
        ...member,
        memberMeals,
        bazaarPaid,
        mealBill,
        balance,
      };
    });
  }, [
    reportMembers,
    monthlyMeals,
    monthlyBazaar,
    mealRate,
  ]);

  const totalReceivable = useMemo(() => {
    return settlementRows.reduce(
      (total, member) =>
        member.balance > 0
          ? total + member.balance
          : total,
      0
    );
  }, [settlementRows]);

  const totalPayable = useMemo(() => {
    return settlementRows.reduce(
      (total, member) =>
        member.balance < 0
          ? total + Math.abs(member.balance)
          : total,
      0
    );
  }, [settlementRows]);

  const handlePrint = () => {
  if (!reportMembers.length) {
    toast.error("No report data available.");
    return;
  }

  if (!reportRef.current) {
    toast.error("Report is not ready.");
    return;
  }

  const printWindow = window.open(
    "",
    "_blank",
    "width=1250,height=850"
  );

  if (!printWindow) {
    toast.error(
      "Print window was blocked. Please allow popups."
    );
    return;
  }

  const reportContent = reportRef.current.outerHTML;

  const documentStyles = Array.from(
    document.querySelectorAll(
      'link[rel="stylesheet"], style'
    )
  )
    .map((styleElement) => styleElement.outerHTML)
    .join("");

  printWindow.document.open();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>
          ${mess?.name || "MessMate"} -
          ${formatMonthName(selectedMonth)}
        </title>

        ${documentStyles}

        <style>
          @page {
            size: A4 landscape;
            margin: 6mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            width: 100%;
            height: auto;
            min-height: 0;
            margin: 0;
            padding: 0;
            overflow: visible;
            color: #000;
            background: #fff;
          }

          body * {
            visibility: visible !important;
          }

          .print-report-sheet,
          .print-report-sheet * {
            visibility: visible !important;
          }

          .print-report-sheet {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            transform: none !important;
          }

          .no-print,
          .floating-print-button {
            display: none !important;
          }

          .export-meal-table-wrapper,
          .print-settlement-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }

          .export-meal-table,
          .print-settlement-table {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            table-layout: fixed !important;
          }

          .export-meal-table th,
          .export-meal-table td {
            min-width: 0 !important;
            height: auto !important;
            padding: 1.1mm 0.35mm !important;
            font-size: 5pt !important;
          }

          .export-meal-table th:first-child,
          .export-meal-table td:first-child {
            width: 14mm !important;
          }

          .export-meal-table th:last-child,
          .export-meal-table td:last-child {
            width: 12mm !important;
          }

          .export-member-column {
            width: auto !important;
            max-width: none !important;
          }

          .print-settlement-table th,
          .print-settlement-table td {
            padding: 1.2mm 0.7mm !important;
            font-size: 5.5pt !important;
          }

          .print-summary-grid,
          .print-section-heading,
          .print-settlement-wrapper,
          .print-verification-grid,
          .print-report-footer {
            break-inside: avoid;
          }

          @media print {
            html,
            body {
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }

            body * {
              visibility: visible !important;
            }

            .print-report-sheet {
              position: static !important;
              width: 100% !important;
              overflow: visible !important;
            }
          }
        </style>
      </head>

      <body>
        ${reportContent}
      </body>
    </html>
  `);

  printWindow.document.close();

  const startPrint = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  if (printWindow.document.readyState === "complete") {
    startPrint();
  } else {
    printWindow.onload = startPrint;
  }
};

  return (
    <div className="export-report-page">
      <header className="export-page-header no-print">
        <div>
          <span className="export-eyebrow">
            <ReceiptText size={14} />
            Printable statement
          </span>

          <h1>Print & Export</h1>

          <p>
            Daily meal sheet and complete monthly
            settlement.
          </p>
        </div>

        <div className="export-actions">
          <label className="export-month-field">
            <CalendarDays size={17} />

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
            />
          </label>

          <button
            type="button"
            className="export-print-button"
            onClick={handlePrint}
          >
            <Printer size={17} />
            Print / Save PDF
          </button>
        </div>
      </header>

      <main
  ref={reportRef}
  className="print-report-sheet"
>
        <header className="print-report-header">
          <div>
            <span className="print-report-label">
              MessMate monthly statement
            </span>

            <h2>{mess?.name || "Mess Report"}</h2>

            <p>{formatMonthName(selectedMonth)}</p>
          </div>

          <div className="print-report-meta">
            <span>Total members</span>
            <strong>{reportMembers.length}</strong>
          </div>
        </header>

        <section className="print-summary-grid">
          <article>
            <span>Total Meals</span>
            <strong>{formatMeal(totalMeals)}</strong>
          </article>

          <article>
            <span>Total Bazaar</span>
            <strong>৳{formatMoney(totalBazaar)}</strong>
          </article>

          <article>
            <span>Meal Rate</span>
            <strong>৳{formatMoney(mealRate)}</strong>
          </article>

          <article>
            <span>Month</span>
            <strong>
              {formatMonthName(selectedMonth)}
            </strong>
          </article>
        </section>

        <div className="print-section-heading">
          <div>
            <span>01</span>
            <h3>Daily Meal Sheet</h3>
          </div>

          <p>Every member&apos;s daily total meal</p>
        </div>

        <div className="export-meal-table-wrapper">
          <table className="export-meal-table">
            <thead>
              <tr>
                <th className="export-date-column">
                  Date
                </th>

                {reportMembers.map((member) => (
                  <th
                    key={member.id}
                    className="export-member-column"
                    title={member.name}
                  >
                    <span>
                      {getDisplayName(member.name)}
                    </span>
                  </th>
                ))}

                <th className="export-total-column">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {monthDates.map((dateItem) => {
                const dailyTotal = reportMembers.reduce(
                  (total, member) =>
                    total +
                    (mealMatrix.get(
                      `${dateItem.date}-${member.id}`
                    ) || 0),
                  0
                );

                return (
                  <tr key={dateItem.date}>
                    <td className="export-date-cell">
                      <strong>{dateItem.day}</strong>
                      <span>{dateItem.weekday}</span>
                    </td>

                    {reportMembers.map((member) => {
                      const amount =
                        mealMatrix.get(
                          `${dateItem.date}-${member.id}`
                        ) || 0;

                      return (
                        <td key={member.id}>
                          {amount > 0
                            ? formatMeal(amount)
                            : "—"}
                        </td>
                      );
                    })}

                    <td className="export-daily-total">
                      {dailyTotal > 0
                        ? formatMeal(dailyTotal)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <th>Monthly</th>

                {reportMembers.map((member) => {
                  const memberTotal =
                    settlementRows.find(
                      (row) => row.id === member.id
                    )?.memberMeals || 0;

                  return (
                    <th key={member.id}>
                      {formatMeal(memberTotal)}
                    </th>
                  );
                })}

                <th>{formatMeal(totalMeals)}</th>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="print-section-heading settlement-heading">
          <div>
            <span>02</span>
            <h3>Monthly Settlement</h3>
          </div>

          <p>Bazaar, meal bill and final balance</p>
        </div>

        <div className="print-settlement-wrapper">
          <table className="print-settlement-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Meal</th>
                <th>Bazaar</th>
                <th>Bill</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {settlementRows.map((member) => {
                const willReceive =
                  member.balance > 0.005;

                const willPay =
                  member.balance < -0.005;

                return (
                  <tr key={member.id}>
                    <td
                      className="print-member-name"
                      title={member.name}
                    >
                      <strong>
                        {getDisplayName(member.name)}
                      </strong>

                      {!member.active && (
                        <small>Former</small>
                      )}
                    </td>

                    <td>
                      {formatMeal(member.memberMeals)}
                    </td>

                    <td>
                      ৳{formatMoney(member.bazaarPaid)}
                    </td>

                    <td>
                      ৳{formatMoney(member.mealBill)}
                    </td>

                    <td>
                      <strong
                        className={
                          willReceive
                            ? "print-balance positive"
                            : willPay
                            ? "print-balance negative"
                            : "print-balance neutral"
                        }
                      >
                        {willReceive ? "+" : ""}
                        {willPay ? "−" : ""}
                        ৳
                        {formatMoney(
                          Math.abs(member.balance)
                        )}
                      </strong>
                    </td>

                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <th>Total</th>
                <th>{formatMeal(totalMeals)}</th>
                <th>৳{formatMoney(totalBazaar)}</th>
                <th>৳{formatMoney(totalBazaar)}</th>
                <th>Balanced</th>
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="print-verification-grid">
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

        <footer className="print-report-footer">
          <p>
            Generated from MessMate •{" "}
            {new Date().toLocaleDateString("en-BD")}
          </p>

          <p>
            Positive balance means টাকা পাবে; negative
            balance means টাকা দেবে।
          </p>
        </footer>
      </main>

      <button
        type="button"
        className="floating-print-button no-print"
        onClick={handlePrint}
        aria-label="Print report"
      >
        <Download size={19} />
      </button>
    </div>
  );
};

export default ExportReport;