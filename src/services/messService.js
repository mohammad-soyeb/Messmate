import { requireSupabase } from "../lib/supabase";

const CURRENT_MESS_STORAGE_KEY =
  "messmate_current_mess_id";

const getSavedMessId = () =>
  localStorage.getItem(CURRENT_MESS_STORAGE_KEY);

const saveMessId = (messId) => {
  if (messId) {
    localStorage.setItem(
      CURRENT_MESS_STORAGE_KEY,
      messId
    );
  } else {
    localStorage.removeItem(
      CURRENT_MESS_STORAGE_KEY
    );
  }
};

const mapMess = (mess) =>
  mess
    ? {
        id: mess.id,
        name: mess.name,
        code: mess.code,
        currency: mess.currency,
        ownerId: mess.owner_id,
        createdAt: mess.created_at,
        updatedAt: mess.updated_at,
      }
    : null;

export const mapMember = (member) =>
  member
    ? {
        id: member.id,
        messId: member.mess_id,
        userId: member.user_id,
        name: member.name,
        email: member.email || "",
        phone: member.phone || "",
        room: member.room || "",
        role: member.role,
        joinedAt: member.joined_at,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      }
    : null;

export const getMessMemberships = async () => {
  const client = requireSupabase();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return [];
  }

  const { data, error } = await client
    .from("members")
    .select(
      "*, mess:messes!members_mess_id_fkey(*)"
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((row) => row.mess)
    .map((row) => ({
      mess: mapMess(row.mess),
      member: mapMember(row),
    }));
};

export const getCurrentMessState = async () => {
  const memberships = await getMessMemberships();

  if (memberships.length === 0) {
    saveMessId(null);
    return null;
  }

  const savedMessId = getSavedMessId();
  const selected =
    memberships.find(
      ({ mess }) => mess.id === savedMessId
    ) || memberships[0];

  saveMessId(selected.mess.id);
  return selected;
};

export const createMess = async ({
  messName,
  managerName,
  managerPhone = "",
  managerEmail = "",
}) => {
  const client = requireSupabase();
  const cleanMessName = messName?.trim();
  const cleanManagerName = managerName?.trim();

  if (!cleanMessName || !cleanManagerName) {
    return {
      success: false,
      message:
        "Mess and manager names are required.",
    };
  }

  const { data, error } = await client.rpc(
    "create_mess_workspace",
    {
      p_mess_name: cleanMessName,
      p_manager_name: cleanManagerName,
      p_manager_phone:
        managerPhone?.trim() || null,
      p_manager_email:
        managerEmail?.trim() || null,
    }
  );

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  const result = Array.isArray(data)
    ? data[0]
    : data;

  saveMessId(result.mess_id);

  return {
    success: true,
    message: "Mess created successfully.",
    mess: {
      id: result.mess_id,
      name: result.mess_name,
      code: result.mess_code,
      currency: result.currency,
    },
    member: {
      id: result.member_id,
      name: cleanManagerName,
      role: "manager",
    },
  };
};

export const joinMess = async ({
  messCode,
  memberName,
  memberPhone = "",
  memberEmail = "",
}) => {
  const client = requireSupabase();
  const { data, error } = await client.rpc(
    "join_mess_by_code",
    {
      p_code: messCode?.trim().toUpperCase(),
      p_name: memberName?.trim(),
      p_phone: memberPhone?.trim() || null,
      p_email: memberEmail?.trim() || null,
    }
  );

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  const result = Array.isArray(data)
    ? data[0]
    : data;

  saveMessId(result.mess_id);

  return {
    success: true,
    message: result.already_joined
      ? "You have already joined this mess."
      : "Mess joined successfully.",
    alreadyJoined: result.already_joined,
    mess: {
      id: result.mess_id,
      name: result.mess_name,
      code: result.mess_code,
      currency: result.currency,
    },
    member: {
      id: result.member_id,
      name: memberName?.trim(),
      role: result.member_role,
    },
  };
};

export const regenerateMessCode = async () => {
  const state = await getCurrentMessState();

  if (!state) {
    throw new Error("No active mess found.");
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc(
    "regenerate_mess_code",
    { p_mess_id: state.mess.id }
  );

  if (error) {
    throw error;
  }

  return data;
};

export const updateMessSettings = async ({
  name,
  currency,
}) => {
  const state = await getCurrentMessState();

  if (!state) {
    throw new Error("No active mess found.");
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("messes")
    .update({
      name: name?.trim(),
      currency,
    })
    .eq("id", state.mess.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapMess(data);
};

export const leaveCurrentMessSession = () => {
  saveMessId(null);
};

export const MESS_STORAGE_KEYS = {
  CURRENT_MESS: CURRENT_MESS_STORAGE_KEY,
};
