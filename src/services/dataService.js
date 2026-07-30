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

const getMembersForMess = async (messId) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("members")
    .select("*")
    .eq("mess_id", messId)
    .order("joined_at", { ascending: true });

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
      "*, member:members!meals_member_id_fkey(name)"
    )
    .eq("mess_id", messId)
    .order("meal_date", { ascending: false });

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
      "*, member:members!bazaar_entries_member_id_fkey(name), items:bazaar_items(*)"
    )
    .eq("mess_id", messId)
    .order("bazaar_date", { ascending: false })
    .order("created_at", { ascending: false });

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
      const { data: signed } = await client.storage
        .from("bazaar-receipts")
        .createSignedUrl(path, 60 * 60);

      if (signed?.signedUrl) {
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

export const getWorkspaceData = async () => {
  const state = await requireWorkspace();
  const [members, meals, bazaarEntries] =
    await Promise.all([
      getMembersForMess(state.mess.id),
      getMealsForMess(state.mess.id),
      getBazaarForMess(state.mess.id),
    ]);

  return {
    ...state,
    members,
    meals,
    bazaarEntries,
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

export const addMember = async ({
  name,
  email,
  phone,
  room,
}) => {
  const state = await requireWorkspace();
  const client = requireSupabase();
  const { data, error } = await client
    .from("members")
    .insert({
      mess_id: state.mess.id,
      name: name?.trim(),
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
  const payload = {
    name: updates.name?.trim(),
    email: updates.email?.trim() || null,
    phone: updates.phone?.trim() || null,
    room: updates.room?.trim() || null,
  };

  if (updates.role) {
    payload.role = updates.role;
  }

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
  const { error } = await client
    .from("members")
    .delete()
    .eq("id", memberId);

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
        onConflict: "mess_id,member_id,meal_date",
      }
    )
    .select(
      "*, member:members!meals_member_id_fkey(name)"
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
  items,
  receiptFile,
}) => {
  const state = await requireWorkspace();
  const client = requireSupabase();
  const grandTotal = items.reduce(
    (total, item) =>
      total + (Number(item.amount) || 0),
    0
  );

  const { data: entry, error: entryError } =
    await client
      .from("bazaar_entries")
      .insert({
        mess_id: state.mess.id,
        member_id: memberId,
        bazaar_date: date,
        grand_total: grandTotal,
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
        items.map((item) => ({
          entry_id: entry.id,
          category: item.category,
          item_name: item.itemName.trim(),
          quantity: Number(item.quantity) || 0,
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
      const receiptPath = `${state.mess.id}/${memberId}/${entry.id}-${safeName}`;
      const { error: uploadError } =
        await client.storage
          .from("bazaar-receipts")
          .upload(receiptPath, receiptFile, {
            upsert: false,
            contentType: receiptFile.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { error: updateError } = await client
        .from("bazaar_entries")
        .update({
          receipt_path: receiptPath,
          receipt_name: receiptFile.name,
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
      (savedEntry) => savedEntry.id === entry.id
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

  if (receiptPath) {
    await client.storage
      .from("bazaar-receipts")
      .remove([receiptPath]);
  }

  const { error } = await client
    .from("bazaar_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    throw error;
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
