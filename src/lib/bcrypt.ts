import * as ExpoCrypto from "expo-crypto";
import bcrypt, { setRandomFallback } from "bcryptjs";

setRandomFallback((length) =>
  Array.from(ExpoCrypto.getRandomBytes(length)),
);

export default bcrypt;
