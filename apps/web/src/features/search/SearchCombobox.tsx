import { useEffect, useId, useRef, useState } from "react"
import type { Localidade } from "@pulso/contracts"
import { useLocalidades } from "../../lib/queries"

type Props = {
  onSelect: (item: Localidade) => void
}

export function SearchCombobox({ onSelect }: Props) {
  const id = useId()
  const [text, setText] = useState("")
  const [term, setTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data, isFetching } = useLocalidades(term)
  const options = data?.resultados ?? []

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text), 150)
    return () => window.clearTimeout(timer)
  }, [text])

  function choose(item: Localidade) {
    setOpen(false)
    setText("")
    setTerm("")
    onSelect(item)
  }

  return (
    <div className="search">
      <label htmlFor={id} className="search__label">
        digite o nome do estado ou da cidade:
      </label>
      <div className="search__box">
        <input
          id={id}
          ref={inputRef}
          className="search__input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          value={text}
          placeholder="ex.: São Paulo, Salvador, SP"
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setActive((current) => Math.min(current + 1, options.length - 1))
            }
            if (event.key === "ArrowUp") {
              event.preventDefault()
              setActive((current) => Math.max(current - 1, 0))
            }
            if (event.key === "Enter" && options[active]) {
              event.preventDefault()
              choose(options[active])
            }
            if (event.key === "Escape") {
              setOpen(false)
            }
          }}
        />
        {isFetching ? <span className="search__hint">buscando…</span> : null}
      </div>
      {open && term.length >= 2 ? (
        <ul id={`${id}-list`} role="listbox" className="search__list">
          {options.length === 0 ? (
            <li className="search__empty" role="status">
              Nenhum estado ou cidade encontrado para “{term}”.
            </li>
          ) : (
            options.map((item, index) => (
              <li
                key={`${item.tipo}-${item.uf}-${item.ibge ?? item.slug}`}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                className={index === active ? "is-active" : ""}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(item)
                }}
              >
                <strong>{item.nome}</strong>
                <span>
                  {item.tipo === "estado" ? "estado" : "cidade"} · {item.uf}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
      <p className="search__help">Aceita nome do estado, sigla (SP) ou nome da cidade.</p>
    </div>
  )
}
