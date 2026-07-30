import { requireSupabase } from "../lib/supabase";

const CURRENT_MESS_STORAGE_KEY =
  "messmate_current_mess_id";

const getSavedMessId = () => {
  return localStorage.getItem(
    CURRENT_MESS_STORAGE_KEY
  );
};

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

const mapMess = (mess) => {
  if (!mess) {
    return null;
  }

  return {
    id: mess.id,
    name: mess.name,
    code: mess.code,
    currency: mess.currency,

    ownerId:
      mess.owner_id,

    createdAt:
      mess.created_at,

    updatedAt:
      mess.updated_at,
  };
};

export const mapMember = (
  member
) => {
  if (!member) {
    return null;
  }

  return {
    id: member.id,

    messId:
      member.mess_id,

    userId:
      member.user_id,

    name:
      member.name,

    email:
      member.email || "",

    phone:
      member.phone || "",

    room:
      member.room || "",

    role:
      member.role,

    isActive:
      member.is_active,

    joinedAt:
      member.joined_at,

    createdAt:
      member.created_at,

    updatedAt:
      member.updated_at,
  };
};

export const getMessMemberships =
  async () => {
    const client =
      requireSupabase();

    const {
      data: { user },
      error: userError,
    } =
      await client.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return [];
    }

    const { data, error } =
      await client
        .from("members")
        .select(
          "*, mess:messes!members_mess_id_fkey(*)"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "is_active",
          true
        )
        .order("joined_at", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    return (data || [])
      .filter(
        (row) => row.mess
      )
      .map((row) => ({
        mess: mapMess(
          row.mess
        ),

        member: mapMember(
          row
        ),
      }));
  };

export const getCurrentMessState =
  async () => {
    const memberships =
      await getMessMemberships();

    if (
      memberships.length === 0
    ) {
      saveMessId(null);

      return null;
    }

    const savedMessId =
      getSavedMessId();

    const selectedMembership =
      memberships.find(
        ({ mess }) =>
          mess.id ===
          savedMessId
      ) || memberships[0];

    saveMessId(
      selectedMembership.mess.id
    );

    return selectedMembership;
  };

export const createMess = async ({
  messName,
  managerName,
  managerPhone = "",
  managerEmail = "",
}) => {
  const client =
    requireSupabase();

  const cleanMessName =
    messName?.trim();

  const cleanManagerName =
    managerName?.trim();

  const cleanManagerPhone =
    managerPhone?.trim();

  const cleanManagerEmail =
    managerEmail?.trim();

  if (!cleanMessName) {
    return {
      success: false,

      message:
        "Mess name is required.",
    };
  }

  if (!cleanManagerName) {
    return {
      success: false,

      message:
        "Manager name is required.",
    };
  }

  const { data, error } =
    await client.rpc(
      "create_mess_workspace",
      {
        p_mess_name:
          cleanMessName,

        p_manager_name:
          cleanManagerName,

        p_manager_phone:
          cleanManagerPhone ||
          null,

        p_manager_email:
          cleanManagerEmail ||
          null,
      }
    );

  if (error) {
    return {
      success: false,

      message:
        error.message,
    };
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result?.mess_id) {
    return {
      success: false,

      message:
        "The mess could not be created.",
    };
  }

  saveMessId(
    result.mess_id
  );

  return {
    success: true,

    message:
      "Mess created successfully.",

    mess: {
      id:
        result.mess_id,

      name:
        result.mess_name,

      code:
        result.mess_code,

      currency:
        result.currency,

      ownerId:
        null,
    },

    member: {
      id:
        result.member_id,

      name:
        cleanManagerName,

      email:
        cleanManagerEmail,

      phone:
        cleanManagerPhone,

      role:
        "manager",

      isActive:
        true,
    },
  };
};

export const joinMess = async ({
  messCode,
  memberName,
  memberPhone = "",
  memberEmail = "",
}) => {
  const client =
    requireSupabase();

  const cleanCode =
    messCode
      ?.trim()
      .toUpperCase();

  const cleanMemberName =
    memberName?.trim();

  const cleanMemberPhone =
    memberPhone?.trim();

  const cleanMemberEmail =
    memberEmail?.trim();

  if (!cleanCode) {
    return {
      success: false,

      message:
        "Mess code is required.",
    };
  }

  if (!cleanMemberName) {
    return {
      success: false,

      message:
        "Member name is required.",
    };
  }

  const { data, error } =
    await client.rpc(
      "join_mess_by_code",
      {
        p_code:
          cleanCode,

        p_name:
          cleanMemberName,

        p_phone:
          cleanMemberPhone ||
          null,

        p_email:
          cleanMemberEmail ||
          null,
      }
    );

  if (error) {
    return {
      success: false,

      message:
        error.message,
    };
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result?.mess_id) {
    return {
      success: false,

      message:
        "The mess could not be joined.",
    };
  }

  saveMessId(
    result.mess_id
  );

  return {
    success: true,

    message:
      result.already_joined
        ? "You have already joined this mess."
        : "Mess joined successfully.",

    alreadyJoined:
      result.already_joined,

    mess: {
      id:
        result.mess_id,

      name:
        result.mess_name,

      code:
        result.mess_code,

      currency:
        result.currency,
    },

    member: {
      id:
        result.member_id,

      name:
        cleanMemberName,

      email:
        cleanMemberEmail,

      phone:
        cleanMemberPhone,

      role:
        result.member_role,

      isActive:
        true,
    },
  };
};

export const regenerateMessCode =
  async () => {
    const state =
      await getCurrentMessState();

    if (!state) {
      throw new Error(
        "No active mess found."
      );
    }

    if (
      state.member.role !==
      "manager"
    ) {
      throw new Error(
        "Only a manager can regenerate the mess code."
      );
    }

    const client =
      requireSupabase();

    const { data, error } =
      await client.rpc(
        "regenerate_mess_code",
        {
          p_mess_id:
            state.mess.id,
        }
      );

    if (error) {
      throw error;
    }

    return data;
  };

export const updateMessSettings =
  async ({
    name,
    currency,
  }) => {
    const state =
      await getCurrentMessState();

    if (!state) {
      throw new Error(
        "No active mess found."
      );
    }

    if (
      state.member.role !==
      "manager"
    ) {
      throw new Error(
        "Only a manager can update mess settings."
      );
    }

    const cleanMessName =
      name?.trim();

    if (!cleanMessName) {
      throw new Error(
        "Mess name is required."
      );
    }

    const allowedCurrencies = [
      "৳",
      "$",
      "₹",
    ];

    if (
      !allowedCurrencies.includes(
        currency
      )
    ) {
      throw new Error(
        "Invalid currency selected."
      );
    }

    const client =
      requireSupabase();

    const { data, error } =
      await client
        .from("messes")
        .update({
          name:
            cleanMessName,

          currency,
        })
        .eq(
          "id",
          state.mess.id
        )
        .select()
        .single();

    if (error) {
      throw error;
    }

    return mapMess(data);
  };

export const leaveCurrentMessSession =
  () => {
    saveMessId(null);
  };

export const MESS_STORAGE_KEYS = {
  CURRENT_MESS:
    CURRENT_MESS_STORAGE_KEY,
};