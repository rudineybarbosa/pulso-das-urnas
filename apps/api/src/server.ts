import { createApp } from "./app"
import { DataStore, type Scenario } from "./store"
import { GoogleSnapshotRepository } from "@pulso/cloud"

const port = Number.parseInt(process.env.PORT ?? "8787", 10)
const mode = process.env.DATA_MODE === "real" ? "real" : "fake"
const scenario = (process.env.SCENARIO ?? "parcial") as Scenario
const speed = Number.parseInt(process.env.REPLAY_SPEED ?? "600", 10)

const repository =
  mode === "real" && process.env.SNAPSHOT_BUCKET
    ? new GoogleSnapshotRepository({
        projectId: process.env.GCP_PROJECT,
        bucketName: process.env.SNAPSHOT_BUCKET,
      })
    : undefined

const app = createApp({ store: new DataStore({ mode, scenario, speed, repository }) })

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    console.log(`Pulso API em http://localhost:${port} (${mode}/${scenario})`)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
