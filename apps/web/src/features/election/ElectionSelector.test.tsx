import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ElectionSelector } from "./ElectionSelector"

describe("ElectionSelector", () => {
  it("offers both rounds and reports the selected election", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ElectionSelector value="6258" onChange={onChange} />)

    expect(screen.getByRole("option", { name: /2º turno/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /1º turno/ })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole("combobox"), "6257")

    expect(onChange).toHaveBeenCalledWith("6257")
  })
})
