export function DesignSystem() {
  return (
    <div className="min-h-screen p-10" style={{ background: "#E0E0C0", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#2C2C1E", marginBottom: 8 }}>
        TrueMachine — Дизайн-система
      </h1>
      <p style={{ fontSize: 14, color: "#6B6B55", marginBottom: 40 }}>
        Токены, типографика, компоненты. Все состояния.
      </p>

      {/* ── ЦВЕТОВАЯ ПАЛИТРА ─────────────────────────────── */}
      <Section title="Цветовая палитра">
        <div className="flex flex-wrap gap-4">
          <Swatch label="Шалфей" hex="#80A080" textColor="#FAFAF5" note="Акцент, кнопки, доход" />
          <Swatch label="Олива" hex="#A0A080" textColor="#FAFAF5" note="Вторичные действия, меню" />
          <Swatch label="Бежевый" hex="#E0C0A0" textColor="#2C2C1E" note="Hover, предупреждения" />
          <Swatch label="Слоновая кость" hex="#E0E0C0" textColor="#2C2C1E" note="Фон страницы, сетки" />
          <Swatch label="Тёплый серый" hex="#C0C0A0" textColor="#2C2C1E" note="Рамки, разделители" />
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          <Swatch label="Шалфей-светлый 20%" hex="#80A080" textColor="#2C2C1E" note="Фон ячеек дохода" opacity={0.2} />
          <Swatch label="Бежевый-светлый 30%" hex="#E0C0A0" textColor="#2C2C1E" note="Hover строк таблицы" opacity={0.3} />
          <Swatch label="Кассовый разрыв" hex="#C0504A" textColor="#FAFAF5" note="Опасность" />
          <Swatch label="Кассовый разрыв фон" hex="#C0504A" textColor="#2C2C1E" note="Фон разрыва" opacity={0.15} />
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          <Swatch label="Текст основной" hex="#2C2C1E" textColor="#FAFAF5" note="Тёмно-оливковый" />
          <Swatch label="Текст вторичный" hex="#6B6B55" textColor="#FAFAF5" note="Приглушённый оливковый" />
          <Swatch label="Белая поверхность" hex="#FAFAF5" textColor="#2C2C1E" note="Тёплый белый" border />
        </div>
      </Section>

      {/* ── ТИПОГРАФИКА ──────────────────────────────────── */}
      <Section title="Типографика">
        <div className="p-6 rounded-lg flex flex-col gap-4" style={{ background: "#FFFFFF", border: "1px solid #D6DCF0" }}>
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 4 }}>H1 · 24px · Bold</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#162044", lineHeight: 1.3, margin: 0 }}>
              Платёжный календарь
            </h1>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 4 }}>H2 · 18px · SemiBold</span>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#162044", lineHeight: 1.4, margin: 0 }}>
              Реестр платежей
            </h2>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 4 }}>H3 · 14px · SemiBold</span>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#162044", lineHeight: 1.5, margin: 0 }}>
              Расчётный счёт №1
            </h3>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 4 }}>Тело · 14px · Regular</span>
            <p style={{ fontSize: 14, fontWeight: 400, color: "#162044", lineHeight: 1.5, margin: 0 }}>
              Сумма платежа включает НДС и прочие расходы по договору аренды офиса.
            </p>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 4 }}>Подпись · 12px · Regular</span>
            <p style={{ fontSize: 12, fontWeight: 400, color: "#556070", lineHeight: 1.5, margin: 0 }}>
              Обновлено 18.06.2026 · Инициатор: Иванова М.С.
            </p>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 4 }}>Цифры · 14px · Medium · Tabular nums</span>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#162044", fontVariantNumeric: "tabular-nums", lineHeight: 1.5, margin: 0 }}>
              1 240 000,00 ₽ &nbsp;·&nbsp; −260 000,00 ₽ &nbsp;·&nbsp; 980 000,00 ₽
            </p>
          </div>
        </div>
      </Section>

      {/* ── КНОПКИ ───────────────────────────────────────── */}
      <Section title="Кнопки">
        <div className="p-6 rounded-lg flex flex-col gap-6" style={{ background: "#FFFFFF", border: "1px solid #D6DCF0" }}>

          {/* Основная */}
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 8 }}>Основная кнопка</span>
            <div className="flex flex-wrap gap-3 items-center">
              <BtnPrimary label="Создать заявку" state="default" />
              <BtnPrimary label="Hover" state="hover" />
              <BtnPrimary label="Нажатие" state="active" />
              <BtnPrimary label="Неактивна" state="disabled" />
            </div>
          </div>

          {/* Вторичная */}
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 8 }}>Вторичная кнопка</span>
            <div className="flex flex-wrap gap-3 items-center">
              <BtnSecondary label="Сформировать реестр" state="default" />
              <BtnSecondary label="Hover" state="hover" />
            </div>
          </div>

          {/* Текстовая */}
          <div>
            <span style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 8 }}>Текстовая кнопка</span>
            <div className="flex flex-wrap gap-3 items-center">
              <BtnText label="Отмена" state="default" />
              <BtnText label="Hover" state="hover" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── БЕЙДЖИ СТАТУСОВ ─────────────────────────────── */}
      <Section title="Бейджи статусов">
        <div className="p-6 rounded-lg flex flex-wrap gap-3" style={{ background: "#FFFFFF", border: "1px solid #D6DCF0" }}>
          <StatusBadge label="Черновик" bg="#EEF2FF" color="#556070" />
          <StatusBadge label="На согласовании" bg="#E4EAFF" color="#7A4C18" />
          <StatusBadge label="Согласована" bgHex="#4A6ADB" bgOpacity={0.2} color="#1A5030" />
          <StatusBadge label="В реестре" bgHex="#1E3275" bgOpacity={0.2} color="#2A3E96" />
          <StatusBadge label="Оплачена" bg="#4A6ADB" color="#FFFFFF" />
          <StatusBadge label="Отклонена" bgHex="#C0504A" bgOpacity={0.15} color="#8B2020" />
        </div>
      </Section>

      {/* ── ПОЛЯ ВВОДА ──────────────────────────────────── */}
      <Section title="Поля ввода">
        <div className="p-6 rounded-lg flex flex-col gap-5" style={{ background: "#FFFFFF", border: "1px solid #D6DCF0", maxWidth: 480 }}>

          {/* Default */}
          <div>
            <label style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 6, fontWeight: 500 }}>
              По умолчанию
            </label>
            <input
              placeholder="Введите сумму"
              readOnly
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #D6DCF0",
                background: "#FFFFFF",
                fontSize: 14,
                color: "#162044",
                outline: "none",
                fontFamily: "Inter, sans-serif",
              }}
            />
          </div>

          {/* Focus */}
          <div>
            <label style={{ fontSize: 12, color: "#556070", display: "block", marginBottom: 6, fontWeight: 500 }}>
              Фокус
            </label>
            <input
              placeholder="125 000,00"
              readOnly
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1.5px solid #4A6ADB",
                background: "#FFFFFF",
                fontSize: 14,
                color: "#162044",
                outline: "none",
                boxShadow: "0 0 0 3px rgba(128, 160, 128, 0.2)",
                fontFamily: "Inter, sans-serif",
              }}
            />
          </div>

          {/* Error */}
          <div>
            <label style={{ fontSize: 12, color: "#C0504A", display: "block", marginBottom: 6, fontWeight: 500 }}>
              Ошибка
            </label>
            <input
              placeholder="Обязательное поле"
              readOnly
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1.5px solid #C0504A",
                background: "#FFFFFF",
                fontSize: 14,
                color: "#162044",
                outline: "none",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <span style={{ fontSize: 12, color: "#C0504A", marginTop: 4, display: "block" }}>
              Укажите сумму платежа
            </span>
          </div>
        </div>
      </Section>

      {/* ── ИКОНОГРАФИКА / СИМВОЛЫ ───────────────────────── */}
      <Section title="Системные символы и токены">
        <div className="p-6 rounded-lg flex flex-wrap gap-8" style={{ background: "#FFFFFF", border: "1px solid #D6DCF0" }}>
          <TokenRow label="Радиус кнопок" value="6px" />
          <TokenRow label="Радиус карточек" value="8px" />
          <TokenRow label="Радиус модалок" value="12px" />
          <TokenRow label="Тень (max)" value="0 1px 3px rgba(22,32,68,0.12)" />
          <TokenRow label="Разделитель" value="#D6DCF0 · 1px" />
          <TokenRow label="Шрифт" value="Inter" />
          <TokenRow label="Позитивный ▲" value="#4A6ADB" colorDot="#4A6ADB" />
          <TokenRow label="Негативный ▼" value="#C0504A" colorDot="#C0504A" />
          <TokenRow label="Остаток =" value="#162044 Bold" colorDot="#162044" />
        </div>
      </Section>
    </div>
  );
}

/* ── Вспомогательные компоненты ──────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#162044",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #D6DCF0",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Swatch({
  label,
  hex,
  textColor,
  note,
  opacity,
  border,
}: {
  label: string;
  hex: string;
  textColor: string;
  note: string;
  opacity?: number;
  border?: boolean;
}) {
  const bg = opacity
    ? hexToRgba(hex, opacity)
    : hex;
  return (
    <div style={{ width: 160 }}>
      <div
        style={{
          height: 72,
          borderRadius: 14,
          background: bg,
          border: border ? "1px solid #D6DCF0" : undefined,
          display: "flex",
          alignItems: "flex-end",
          padding: "8px 10px",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>
          {hex}{opacity ? ` · ${Math.round(opacity * 100)}%` : ""}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#162044" }}>{label}</div>
      <div style={{ fontSize: 11, color: "#556070" }}>{note}</div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function BtnPrimary({ label, state }: { label: string; state: "default" | "hover" | "active" | "disabled" }) {
  const bgMap = { default: "#4A6ADB", hover: "#6D28D9", active: "#2A3E96", disabled: "#D6DCF0" };
  const textMap = { default: "#FFFFFF", hover: "#FFFFFF", active: "#FFFFFF", disabled: "#FFFFFF" };
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          background: bgMap[state],
          color: textMap[state],
          border: "none",
          fontSize: 14,
          fontWeight: 500,
          cursor: state === "disabled" ? "not-allowed" : "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </button>
      <span style={{ fontSize: 11, color: "#556070" }}>{state}</span>
    </div>
  );
}

function BtnSecondary({ label, state }: { label: string; state: "default" | "hover" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          background: state === "hover" ? "rgba(74,106,219,0.10)" : "transparent",
          color: "#1E3275",
          border: "1.5px solid #1E3275",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </button>
      <span style={{ fontSize: 11, color: "#556070" }}>{state}</span>
    </div>
  );
}

function BtnText({ label, state }: { label: string; state: "default" | "hover" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "transparent",
          color: state === "hover" ? "#4A6ADB" : "#1E3275",
          border: "none",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
          textDecoration: state === "hover" ? "underline" : "none",
        }}
      >
        {label}
      </button>
      <span style={{ fontSize: 11, color: "#556070" }}>{state}</span>
    </div>
  );
}

function StatusBadge({
  label,
  bg,
  bgHex,
  bgOpacity,
  color,
}: {
  label: string;
  bg?: string;
  bgHex?: string;
  bgOpacity?: number;
  color: string;
}) {
  const background = bg ?? (bgHex && bgOpacity ? hexToRgba(bgHex, bgOpacity) : "#EEF2FF");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        background,
        color,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {label}
    </span>
  );
}

function TokenRow({
  label,
  value,
  colorDot,
}: {
  label: string;
  value: string;
  colorDot?: string;
}) {
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontSize: 11, color: "#556070", marginBottom: 2 }}>{label}</div>
      <div className="flex items-center gap-2">
        {colorDot && (
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: colorDot,
              flexShrink: 0,
              border: colorDot === "#FFFFFF" ? "1px solid #D6DCF0" : undefined,
            }}
          />
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: "#162044", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
      </div>
    </div>
  );
}
