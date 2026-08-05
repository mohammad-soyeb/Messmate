import { requireSupabase } from "../lib/supabase";
import {
  getCurrentMessState,
  mapMember,
} from "./messService";

const requireWorkspace = async () => {
  const state = await getCurrentMessState();

  if (!state) {
    throw new Error(
      "Create or join a mess before adding records."
    );
  }

  return state;
};

const mapMeal = (meal) => ({
  id: meal.id,
  messId: meal.mess_id,
  memberId: meal.member_id,
  memberName: meal.member?.name || "",
  date: meal.meal_date,
  breakfast: Number(meal.breakfast) || 0,
  lunch: Number(meal.lunch) || 0,
  dinner: Number(meal.dinner) || 0,
  createdAt: meal.created_at,
  updatedAt: meal.updated_at,
});

const mapBazaarEntry = (entry) => ({
  id: entry.id,
  messId: entry.mess_id,
  memberId: entry.member_id,
  memberName: entry.member?.name || "",
  date: entry.bazaar_date,
  grandTotal: Number(entry.grand_total) || 0,
  paymentSource:
    entry.payment_source || "personal",
  receipt: entry.receipt_url || null,
  receiptPath: entry.receipt_path || null,
  receiptName: entry.receipt_name || "",
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,

  items: (entry.items || []).map((item) => ({
    id: item.id,
    category: item.category,
    itemName: item.item_name,
    quantity: Number(item.quantity) || 0,
    amount: Number(item.amount) || 0,
  })),
});

const mapFinancialEntry = (entry) => ({
  id: entry.id,
  messId: entry.mess_id,
  memberId: entry.member_id,
  memberName: entry.member?.name || "",
  month: entry.entry_month
    ? String(entry.entry_month).slice(0, 7)
    : "",
  type: entry.entry_type,
  amount: Number(entry.amount) || 0,
  date: entry.transaction_date,
  note: entry.note || "",
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,
});

const getMembersForMess = async (messId) => {
  const client = requireSupabase();

  const { data, error } = await client
    .from("members")
    .select("*")
    .eq("mess_id", messId)
    .eq("is_active", true)
    .order("joined_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data || []).map(mapMember);
};

const getMealsForMess = async (messId) => {
  const client = requireSupabase();

  const { data, error } = await client
    .from("meals")
    .select(
      `
        *,
        member:members!meals_member_id_fkey(name)
      `
    )
    .eq("mess_id", messId)
    .order("meal_date", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data || []).map(mapMeal);
};

const getBazaarForMess = async (messId) => {
  const client = requireSupabase();

  const { data, error } = await client
    .from("bazaar_entries")
    .select(
      `
        *,
        member:members!bazaar_entries_member_id_fkey(name),
        items:bazaar_items(*)
      `
    )
    .eq("mess_id", messId)
    .order("bazaar_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const entries = data || [];

  const paths = entries
    .map((entry) => entry.receipt_path)
    .filter(Boolean);

  const signedUrls = new Map();

  await Promise.all(
    paths.map(async (path) => {
      const { data: signed, error: signedError } =
        await client.storage
          .from("bazaar-receipts")
          .createSignedUrl(path, 60 * 60);

      if (!signedError && signed?.signedUrl) {
        signedUrls.set(path, signed.signedUrl);
      }
    })
  );

  return entries.map((entry) =>
    mapBazaarEntry({
      ...entry,
      receipt_url:
        signedUrls.get(entry.receipt_path) || null,
    })
  );
};

const getFinancialEntriesForMess = async (
  messId
) => {
  const client = requireSupabase();

  const { data, error } = await client
    .from("member_financial_entries")
    .select(
      `
        *,
        member:members!member_financial_entries_member_id_fkey(name)
      `
    )
    .eq("mess_id", messId)
    .order("entry_month", {
      ascending: false,
    })
    .order("transaction_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data || []).map(mapFinancialEntry);
};

export const getWorkspaceData = async () => {
  const state = await requireWorkspace();

  const [
    members,
    meals,
    bazaarEntries,
    financialEntries,
  ] = await Promise.all([
      getMembersForMess(state.mess.id),
      getMealsForMess(state.mess.id),
      getBazaarForMess(state.mess.id),
      getFinancialEntriesForMess(
        state.mess.id
      ),
    ]);

  return {
    ...state,
    members,
    meals,
    bazaarEntries,
    financialEntries,
  };
};

export const getMembers = async () => {
  const state = await requireWorkspace();

  return getMembersForMess(state.mess.id);
};

export const getMeals = async () => {
  const state = await requireWorkspace();

  return getMealsForMess(state.mess.id);
};

export const getBazaarEntries = async () => {
  const state = await requireWorkspace();

  return getBazaarForMess(state.mess.id);
};

export const getFinancialEntries = async () => {
  const state = await requireWorkspace();

  return getFinancialEntriesForMess(
    state.mess.id
  );
};

export const setOpeningBalance = async ({
  memberId,
  month,
  amount,
  note = "",
}) => {
  if (!memberId || !month) {
    throw new Error(
      "Member and month are required."
    );
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    throw new Error(
      "Enter a valid opening balance."
    );
  }

  const state = await requireWorkspace();
  const client = requireSupabase();

  const { data, error } = await client.rpc(
    "set_member_opening_balance",
    {
      p_mess_id: state.mess.id,
      p_member_id: memberId,
      p_month: `${month}-01`,
      p_amount: numericAmount,
      p_note: note?.trim() || null,
    }
  );

  if (error) {
    throw error;
  }

  return data;
};

export const addMemberDeposit = async ({
  memberId,
  date,
  amount,
  note = "",
}) => {
  if (!memberId || !date) {
    throw new Error(
      "Member and deposit date are required."
    );
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Deposit amount must be greater than zero."
    );
  }

  const state = await requireWorkspace();
  const client = requireSupabase();

  const { data, error } = await client
    .from("member_financial_entries")
    .insert({
      mess_id: state.mess.id,
      member_id: memberId,
      entry_month: `${date.slice(0, 7)}-01`,
      entry_type: "deposit",
      amount: numericAmount,
      transaction_date: date,
      note: note?.trim() || null,
    })
    .select(
      `
        *,
        member:members!member_financial_entries_member_id_fkey(name)
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return mapFinancialEntry(data);
};

export const deleteMemberFinancialEntry = async (
  entryId
) => {
  const client = requireSupabase();

  const { data, error } = await client
    .from("member_financial_entries")
    .delete()
    .eq("id", entryId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new Error(
      "Entry was not deleted. Manager permission is required."
    );
  }
};

export const carryForwardMemberBalances = async ({
  sourceMonth,
  balances,
}) => {
  if (!sourceMonth) {
    throw new Error("Source month is required.");
  }

  const validBalances = (balances || [])
    .filter(
      (item) =>
        item.memberId &&
        Number.isFinite(Number(item.amount))
    )
    .map((item) => ({
      member_id: item.memberId,
      amount: Number(item.amount),
    }));

  if (!validBalances.length) {
    throw new Error(
      "No member balance is available to transfer."
    );
  }

  const state = await requireWorkspace();
  const client = requireSupabase();

  const { data, error } = await client.rpc(
    "carry_forward_member_balances",
    {
      p_mess_id: state.mess.id,
      p_source_month: `${sourceMonth}-01`,
      p_balances: validBalances,
    }
  );

  if (error) {
    throw error;
  }

  return data;
};

export const addMember = async ({
  name,
  email,
  phone,
  room,
}) => {
  const state = await requireWorkspace();
  const client = requireSupabase();

  const cleanName = name?.trim();
  if (!cleanName) {
    throw new Error("Member name is required.");
  }

  const { data, error } = await client
    .from("members")
    .insert({
      mess_id: state.mess.id,
      name: cleanName,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      room: room?.trim() || null,
      role: "member",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapMember(data);
};

export const updateMember = async (
  memberId,
  updates
) => {
  const client = requireSupabase();

  const payload = {};

  if (updates.name !== undefined) {
    const cleanName = updates.name?.trim();

    if (!cleanName) {
      throw new Error(
        "Member name is required."
      );
    }

    payload.name = cleanName;
  }

  if (updates.email !== undefined) {
    payload.email =
      updates.email?.trim() || null;
  }

  if (updates.phone !== undefined) {
    payload.phone =
      updates.phone?.trim() || null;
  }

  if (updates.room !== undefined) {
    payload.room =
      updates.room?.trim() || null;
  }

  if (updates.role !== undefined) {
    payload.role = updates.role;
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("members")
    .update(payload)
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapMember(data);
};

export const removeMember = async (memberId) => {
  const client = requireSupabase();

  const { error } = await client.rpc(
    "remove_member_from_mess",
    {
      p_member_id: memberId,
    }
  );

  if (error) {
    throw error;
  }
};

export const saveMeal = async ({
  memberId,
  date,
  breakfast,
  lunch,
  dinner,
}) => {
  const state = await requireWorkspace();
  const client = requireSupabase();

  const { data, error } = await client
    .from("meals")
    .upsert(
      {
        mess_id: state.mess.id,
        member_id: memberId,
        meal_date: date,
        breakfast: Number(breakfast) || 0,
        lunch: Number(lunch) || 0,
        dinner: Number(dinner) || 0,
      },
      {
        onConflict:
          "mess_id,member_id,meal_date",
      }
    )
    .select(
      `
        *,
        member:members!meals_member_id_fkey(name)
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return mapMeal(data);
};

export const createBazaarEntry = async ({
  date,
  memberId,
  paymentSource = "personal",
  items,
  receiptFile,
}) => {
  const state = await requireWorkspace();
  const client = requireSupabase();

  const validItems = (items || []).filter(
    (item) =>
      item.itemName?.trim() &&
      Number(item.amount) > 0
  );

  if (validItems.length === 0) {
    throw new Error(
      "Add at least one bazaar item."
    );
  }

  const grandTotal = validItems.reduce(
    (total, item) =>
      total + (Number(item.amount) || 0),
    0
  );

  const normalizedPaymentSource =
    paymentSource === "mess_fund"
      ? "mess_fund"
      : "personal";

  const { data: entry, error: entryError } =
    await client
      .from("bazaar_entries")
      .insert({
        mess_id: state.mess.id,
        member_id: memberId,
        bazaar_date: date,
        grand_total: grandTotal,
        payment_source:
          normalizedPaymentSource,
      })
      .select()
      .single();

  if (entryError) {
    throw entryError;
  }

  try {
    const { error: itemsError } = await client
      .from("bazaar_items")
      .insert(
        validItems.map((item) => ({
          entry_id: entry.id,
          category: item.category,
          item_name: item.itemName.trim(),
          quantity:
            Number(item.quantity) || 0,
          amount: Number(item.amount) || 0,
        }))
      );

    if (itemsError) {
      throw itemsError;
    }

    if (receiptFile) {
      const safeName = receiptFile.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-");

      const receiptPath =
        `${state.mess.id}/` +
        `${memberId}/` +
        `${entry.id}-${safeName}`;

      const { error: uploadError } =
        await client.storage
          .from("bazaar-receipts")
          .upload(
            receiptPath,
            receiptFile,
            {
              upsert: false,
              contentType: receiptFile.type,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const { error: updateError } =
        await client
          .from("bazaar_entries")
          .update({
            receipt_path: receiptPath,
            receipt_name: receiptFile.name,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", entry.id);

      if (updateError) {
        throw updateError;
      }
    }

    const entries = await getBazaarForMess(
      state.mess.id
    );

    return entries.find(
      (savedEntry) =>
        savedEntry.id === entry.id
    );
  } catch (error) {
    await client
      .from("bazaar_entries")
      .delete()
      .eq("id", entry.id);

    throw error;
  }
};

export const deleteBazaarEntry = async (
  entryId,
  receiptPath
) => {
  const client = requireSupabase();

  const { data: deletedRows, error } =
    await client
      .from("bazaar_entries")
      .delete()
      .eq("id", entryId)
      .select("id");

  if (error) {
    throw error;
  }

  if (!deletedRows?.length) {
    throw new Error(
      "Bazaar entry was not deleted. Manager permission may be required."
    );
  }

  if (receiptPath) {
    const { error: storageError } =
      await client.storage
        .from("bazaar-receipts")
        .remove([receiptPath]);

    if (storageError) {
      console.error(
        "Receipt removal failed:",
        storageError
      );
    }
  }
};

export const resetActivityData = async () => {
  const state = await requireWorkspace();
  const client = requireSupabase();

  const { error } = await client.rpc(
    "reset_mess_activity",
    {
      p_mess_id: state.mess.id,
    }
  );

  if (error) {
    throw error;
  }
};

export const deleteMessWorkspace = async (
  confirmationName
) => {
  const state = await requireWorkspace();
  const client = requireSupabase();

  const { error } = await client.rpc(
    "delete_mess_workspace",
    {
      p_mess_id: state.mess.id,
      p_confirmation_name:
        confirmationName?.trim(),
    }
  );

  if (error) {
    throw error;
  }
};