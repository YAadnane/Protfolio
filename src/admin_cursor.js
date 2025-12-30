
// Cursor Logic
export function initCursor() {
    const cursorDot = document.querySelector("[data-cursor-dot]");
    const cursorOutline = document.querySelector("[data-cursor-outline]");

    if (!cursorDot || !cursorOutline) return;

    window.addEventListener("mousemove", (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        // Dot follows immediately
        // Dot follows immediately
        if (window.gsap) {
            gsap.set(cursorDot, {
                x: posX,
                y: posY,
                xPercent: -50,
                yPercent: -50
            });
        } else {
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
        }

        // Outline follows with GSAP lag
        if (window.gsap) {
            gsap.to(cursorOutline, {
                x: posX,
                y: posY,
                xPercent: -50,
                yPercent: -50,
                duration: 0.15,
                ease: "power2.out"
            });
        } else {
             // Fallback if GSAP fails
             cursorOutline.style.left = `${posX}px`;
             cursorOutline.style.top = `${posY}px`;
        }
    });

    // Hover effects
    const interactiveElements = document.querySelectorAll("a, button, input, select, textarea, .card, .chart-container");
    interactiveElements.forEach(el => {
        el.addEventListener("mouseenter", () => document.body.classList.add("hovering"));
        el.addEventListener("mouseleave", () => document.body.classList.remove("hovering"));
    });
}
