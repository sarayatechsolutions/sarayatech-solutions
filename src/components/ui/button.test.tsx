import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrowRight } from "lucide-react";
import { Button, buttonVariants, BUTTON_LOADING_LABEL } from "./button";
import { CONSULTATION_CTA, CONSULTATION_CTA_LABEL, consultationCtaLabel } from "@/content/cta";
import { BUSINESS } from "@/config/business";

// Design audit 2026-11-27, section 3.2, batch B3: one button system, callers add layout only.
const classes = (variant?: Parameters<typeof buttonVariants>[0]) => buttonVariants(variant).split(/\s+/);

describe("button variants (design audit B3)", () => {
  it("primary is the CTA red and goes darker on hover and press, never lighter", () => {
    const c = classes({ variant: "primary" });
    expect(c).toEqual(expect.arrayContaining(["bg-accent", "text-accent-foreground", "hover:bg-accent-hover", "active:bg-accent-active"]));
    expect(c.join(" ")).not.toMatch(/accent-light/);
  });

  it("secondary is navy and is the default variant", () => {
    expect(classes({ variant: "secondary" })).toEqual(expect.arrayContaining(["bg-primary", "hover:bg-primary-light", "active:bg-primary-dark"]));
    expect(classes()).toEqual(expect.arrayContaining(["bg-primary", "min-h-11"]));
  });

  it.each(["outline", "ghost", "on-dark", "link"] as const)("%s never turns red on hover", (variant) => {
    const hover = classes({ variant }).filter((x) => x.startsWith("hover:"));
    expect(hover.join(" ")).not.toMatch(/accent|destructive/);
  });

  it("on-dark has a 3:1 border on navy and a white focus outline", () => {
    expect(classes({ variant: "on-dark" })).toEqual(expect.arrayContaining(["border-white/60", "text-white", "focus-visible:outline-white"]));
  });

  it("animates colour, border, shadow and transform only, never `all`", () => {
    const c = classes();
    expect(c).toContain("transition-[background-color,border-color,color,box-shadow,transform]");
    expect(c).not.toContain("transition-all");
    expect(c).toContain("motion-safe:active:translate-y-px");
    expect(c).not.toContain("active:translate-y-px");
  });
});

describe("button sizes keep every touch target at 44 px or more (design audit B3)", () => {
  it.each([
    ["md", "min-h-11"],
    ["lg", "min-h-12"],
    ["xl", "min-h-14"],
    ["default", "min-h-11"],
    ["sm", "min-h-11"],
  ] as const)("%s is at least %s", (size, min) => {
    expect(classes({ size })).toContain(min);
  });

  it("icon is a 44 x 44 square", () => {
    expect(classes({ size: "icon" })).toEqual(expect.arrayContaining(["h-11", "w-11"]));
  });

  it("xl wraps instead of overflowing a 320 px column", () => {
    const c = classes({ size: "xl" });
    expect(c).toEqual(expect.arrayContaining(["whitespace-normal", "h-auto"]));
    expect(c).not.toContain("h-14");
  });

  it("a caller's layout class survives the merge and nothing else needs restating", () => {
    render(
      <Button variant="primary" size="xl" className="w-full sm:w-auto">
        Go
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toHaveClass("w-full", "sm:w-auto", "min-h-14", "bg-accent", "hover:bg-accent-hover");
  });
});

describe("loading state (design audit B3)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows a spinner and the loading label, is disabled and aria-busy", () => {
    const { rerender, container } = render(<Button loading={false}>Send Message</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    expect(container.querySelector("[data-button-spinner]")).toBeNull();

    rerender(<Button loading>Send Message</Button>);
    const btn = screen.getByRole("button", { name: BUTTON_LOADING_LABEL });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    // In progress, not unavailable: the label keeps full contrast instead of the disabled 50% fade.
    expect(btn).toHaveClass("aria-busy:opacity-100", "aria-busy:cursor-wait");
    const spinner = container.querySelector("[data-button-spinner]");
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute("aria-hidden", "true");
    // Reduced motion: a static dot, no spin.
    expect(spinner).toHaveClass("motion-safe:animate-spin", "motion-reduce:bg-current");
    expect(spinner).not.toHaveClass("animate-spin");
  });

  it("holds its resting width so the button does not jump", () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(212);
    const { rerender } = render(<Button loading={false}>Send Message</Button>);
    rerender(<Button loading>Send Message</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ minWidth: "212px" });

    rerender(<Button loading={false}>Send Message</Button>);
    expect(screen.getByRole("button", { name: "Send Message" }).style.minWidth).toBe("");
  });

  it("takes a custom loading label", () => {
    render(
      <Button loading loadingLabel="Sending your request...">
        Get My Free Audit
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Sending your request..." })).toBeDisabled();
  });
});

describe("trailing icon (design audit B3)", () => {
  it("renders after the label inside an asChild link, hidden from assistive tech, nudging motion-safe only", () => {
    render(
      <Button asChild variant="primary" iconEnd={<ArrowRight />}>
        <a href="/free-audit">Get My Free Audit</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Get My Free Audit" });
    expect(link.tagName).toBe("A");
    expect(link.querySelector("button")).toBeNull();
    const icon = link.lastElementChild as HTMLElement;
    expect(icon.tagName).toBe("SPAN");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon.querySelector("svg")).not.toBeNull();
    expect(icon).toHaveClass("motion-safe:group-hover:translate-x-0.5");
    expect(link).toHaveClass("group", "bg-accent");
  });
});

describe("consultation label (design audit FD-27, section 5)", () => {
  it("says Request while the booking link is unverified and Book once it is verified", () => {
    expect(BUSINESS.booking.verified).toBe(false);
    expect(CONSULTATION_CTA_LABEL).toBe("Request a Free Consultation");
    const verified = { ...BUSINESS, booking: { ...BUSINESS.booking, verified: true, url: "https://example.com/book" } };
    expect(consultationCtaLabel(verified)).toBe(CONSULTATION_CTA.book);
    expect(CONSULTATION_CTA.book).toBe("Book a Free Consultation");
  });
});
