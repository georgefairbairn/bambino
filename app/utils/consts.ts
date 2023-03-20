export const enum ROUTES {
  HOME = "/",
  LIBRARY = "/library",
  NAMES = "/names",

  SIGNIN = "?signin=true",
}

export const enum AUTH_STATUS {
  SIGNED_IN = "signed_in",
  SIGNED_OUT = "signed_out",
}

export const enum SIGNED_OUT_STATUS {
  // when we're not sure if they have an account or if they're a new user
  UNDETERMINED = "undetermined",
  // when they've selected that they're a new user, but they haven't signed up yet
  NEW_USER = "new_user",
  // when they've selected that they have an account, but they haven't signed in yet
  HAS_ACCOUNT = "has_account",
}

export const enum GENDER {
  BOY = "boy",
  GIRL = "girl",
  BOTH = "both",
}
