import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  stages: [
    { duration: "2m", target: 2000 },
    { duration: "5m", target: 10000 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.001"],
    http_req_duration: ["p(95)<150"],
  },
}

const BASE = __ENV.BASE_URL ?? "https://pulso-das-urnas-dev.web.app"

export default function panorama() {
  const response = http.get(`${BASE}/api/v1/panorama?cargo=1`, {
    headers: { Accept: "application/json" },
  })
  check(response, {
    "status 200": (result) => result.status === 200,
    "27 estados": (result) => {
      try {
        return JSON.parse(result.body).estados.length === 27
      } catch {
        return false
      }
    },
  })
  sleep(5)
}

export function cidade() {
  const response = http.get(`${BASE}/api/v1/municipios/3550308?cargo=1`)
  check(response, { "município 200": (result) => result.status === 200 })
  sleep(5)
}
