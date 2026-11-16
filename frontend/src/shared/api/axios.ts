import axios from "axios";

import { env } from "@shared/config";

export const $axios = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
  },
});
