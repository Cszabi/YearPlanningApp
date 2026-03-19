import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import NorthStarIllustration from "./NorthStarIllustration";

describe("NorthStarIllustration", () => {
  it("renders an SVG element", () => {
    const { container } = render(<NorthStarIllustration />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("accepts and applies a className prop", () => {
    const { container } = render(<NorthStarIllustration className="my-custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("my-custom-class");
  });

  it("contains animated ray elements", () => {
    const { container } = render(<NorthStarIllustration />);
    const rays = container.querySelectorAll(".star-ray");
    expect(rays.length).toBeGreaterThan(0);
  });
});
