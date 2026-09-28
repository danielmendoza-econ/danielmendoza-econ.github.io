const cursor = document.querySelector(".custom-cursor");

if (cursor && window.matchMedia("(pointer: fine)").matches) {
  const updateCursorState = (target) => {
    const element = target instanceof Element ? target : target.parentElement;
    const caseStudy = element?.closest("[data-case-study]");

    cursor.classList.toggle("is-over-case-study", Boolean(caseStudy));
    cursor.classList.toggle(
      "is-over-link",
      Boolean(element?.closest("a")) && !caseStudy
    );
  };

  window.addEventListener("pointermove", (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    cursor.classList.add("is-visible");
    updateCursorState(event.target);
  });

  document.addEventListener("pointerover", (event) => {
    updateCursorState(event.target);
  });

  document.documentElement.addEventListener("mouseleave", () => {
    cursor.classList.remove("is-visible");
  });
}

const movingNotes = document.querySelectorAll("[data-note-motion]");

if (
  movingNotes.length &&
  window.matchMedia("(pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  movingNotes.forEach((note) => {
    note.addEventListener("pointerenter", () => {
      note.classList.add("is-active");
    });

    note.addEventListener("pointermove", (event) => {
      const bounds = note.getBoundingClientRect();
      const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
      const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;

      note.style.setProperty("--pointer-x", `${horizontal * 10}px`);
      note.style.setProperty("--pointer-y", `${vertical * 7}px`);
      note.style.setProperty("--pointer-r", `${horizontal * 1.8}deg`);
    });

    note.addEventListener("pointerleave", () => {
      note.classList.remove("is-active");
      note.style.setProperty("--pointer-x", "0px");
      note.style.setProperty("--pointer-y", "0px");
      note.style.setProperty("--pointer-r", "0deg");
    });
  });
}

const phaseCanvas = document.querySelector("[data-phase-field]");

if (phaseCanvas) {
  const phaseHero = phaseCanvas.closest(".intro-hero");
  const phaseCopy = phaseHero?.querySelector(".intro-copy");
  const phaseContext = phaseCanvas.getContext("2d");

  if (phaseHero && phaseCopy && phaseContext) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const pointer = { x: 0, y: 0, strength: 0 };
    const pointerTarget = { x: 0, y: 0, strength: 0 };
    let phasePoints = [];
    let phaseWidth = 0;
    let phaseHeight = 0;
    let phaseFrame = 0;

    const clamp = (value, minimum, maximum) =>
      Math.min(maximum, Math.max(minimum, value));

    const drawPhaseArrow = (x, y, angle, length, opacity, influence) => {
      const half = length * 0.5;
      const head = length * 0.28;

      phaseContext.save();
      phaseContext.translate(x, y);
      phaseContext.rotate(angle);
      phaseContext.beginPath();
      phaseContext.moveTo(-half, 0);
      phaseContext.lineTo(half, 0);
      phaseContext.lineTo(half - head, -head * 0.68);
      phaseContext.moveTo(half, 0);
      phaseContext.lineTo(half - head, head * 0.68);
      phaseContext.strokeStyle = influence > 0.02
        ? `rgba(2, 127, 255, ${opacity})`
        : `rgba(58, 82, 108, ${opacity})`;
      phaseContext.lineWidth = 0.8 + influence * 0.45;
      phaseContext.lineCap = "round";
      phaseContext.lineJoin = "round";
      phaseContext.stroke();
      phaseContext.restore();
    };

    const drawPhaseField = () => {
      const heroBounds = phaseHero.getBoundingClientRect();
      const copyBounds = phaseCopy.getBoundingClientRect();
      const protectedArea = {
        left: copyBounds.left - heroBounds.left - 42,
        right: copyBounds.right - heroBounds.left + 42,
        top: copyBounds.top - heroBounds.top - 48,
        bottom: copyBounds.bottom - heroBounds.top + 48,
      };
      const centerX = (protectedArea.left + protectedArea.right) * 0.5;
      const centerY = (protectedArea.top + protectedArea.bottom) * 0.5;
      const cursorRadius = phaseWidth < 720 ? 125 : 185;

      phaseContext.clearRect(0, 0, phaseWidth, phaseHeight);

      phasePoints.forEach(({ x, y }) => {
        const edgeX = Math.max(protectedArea.left - x, 0, x - protectedArea.right);
        const edgeY = Math.max(protectedArea.top - y, 0, y - protectedArea.bottom);
        const distanceFromText = Math.hypot(edgeX, edgeY);
        const textFade = clamp(distanceFromText / 82, 0, 1);

        if (textFade < 0.04) return;

        const normalizedX = (x - centerX) / Math.max(phaseWidth * 0.5, 1);
        const normalizedY = (y - centerY) / Math.max(phaseHeight * 0.5, 1);

        // Stable spiral: dx/dt = y - ax, dy/dt = -x - ay.
        let vectorX = normalizedY - 0.3 * normalizedX;
        let vectorY = -normalizedX - 0.3 * normalizedY;
        let magnitude = Math.hypot(vectorX, vectorY) || 1;
        vectorX /= magnitude;
        vectorY /= magnitude;

        const cursorX = x - pointer.x;
        const cursorY = y - pointer.y;
        const cursorDistance = Math.hypot(cursorX, cursorY) || 1;
        const cursorInfluence = pointer.strength * Math.pow(
          clamp(1 - cursorDistance / cursorRadius, 0, 1),
          1.6
        );

        if (cursorInfluence > 0) {
          const tangentX = -cursorY / cursorDistance;
          const tangentY = cursorX / cursorDistance;
          vectorX = vectorX * (1 - cursorInfluence) + tangentX * cursorInfluence;
          vectorY = vectorY * (1 - cursorInfluence) + tangentY * cursorInfluence;
          magnitude = Math.hypot(vectorX, vectorY) || 1;
          vectorX /= magnitude;
          vectorY /= magnitude;
        }

        const offset = cursorInfluence * 5;
        const offsetX = (cursorX / cursorDistance) * offset;
        const offsetY = (cursorY / cursorDistance) * offset;
        const angle = Math.atan2(vectorY, vectorX);
        const length = 5.5 + cursorInfluence * 5.5;
        const opacity = textFade * (0.25 + cursorInfluence * 0.55);

        drawPhaseArrow(
          x + offsetX,
          y + offsetY,
          angle,
          length,
          opacity,
          cursorInfluence
        );
      });
    };

    const animatePhaseField = () => {
      phaseFrame = 0;
      pointer.x += (pointerTarget.x - pointer.x) * 0.18;
      pointer.y += (pointerTarget.y - pointer.y) * 0.18;
      pointer.strength += (pointerTarget.strength - pointer.strength) * 0.14;
      drawPhaseField();

      const stillMoving =
        Math.abs(pointerTarget.x - pointer.x) > 0.25 ||
        Math.abs(pointerTarget.y - pointer.y) > 0.25 ||
        Math.abs(pointerTarget.strength - pointer.strength) > 0.01;

      if (stillMoving) phaseFrame = requestAnimationFrame(animatePhaseField);
    };

    const schedulePhaseDraw = () => {
      if (!phaseFrame) phaseFrame = requestAnimationFrame(animatePhaseField);
    };

    const resizePhaseField = () => {
      const bounds = phaseHero.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 2);
      phaseWidth = Math.max(1, Math.round(bounds.width));
      phaseHeight = Math.max(1, Math.round(bounds.height));
      phaseCanvas.width = Math.round(phaseWidth * density);
      phaseCanvas.height = Math.round(phaseHeight * density);
      phaseContext.setTransform(density, 0, 0, density, 0, 0);

      const spacing = phaseWidth < 720 ? 31 : 41;
      phasePoints = [];
      for (let y = spacing * 0.65; y < phaseHeight; y += spacing) {
        for (let x = spacing * 0.65; x < phaseWidth; x += spacing) {
          phasePoints.push({ x, y });
        }
      }

      pointer.x = pointerTarget.x = phaseWidth * 0.5;
      pointer.y = pointerTarget.y = phaseHeight * 0.5;
      drawPhaseField();
    };

    if (!reducedMotion.matches && finePointer.matches) {
      phaseHero.addEventListener("pointermove", (event) => {
        const bounds = phaseHero.getBoundingClientRect();
        pointerTarget.x = event.clientX - bounds.left;
        pointerTarget.y = event.clientY - bounds.top;
        pointerTarget.strength = 1;
        schedulePhaseDraw();
      });

      phaseHero.addEventListener("pointerleave", () => {
        pointerTarget.strength = 0;
        schedulePhaseDraw();
      });
    }

    const phaseResizeObserver = new ResizeObserver(resizePhaseField);
    phaseResizeObserver.observe(phaseHero);
    document.fonts?.ready.then(resizePhaseField);
    resizePhaseField();
  }
}

const caseNavLinks = [...document.querySelectorAll("[data-case-nav]")];

if (caseNavLinks.length && "IntersectionObserver" in window) {
  const caseSections = caseNavLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const setActiveCaseSection = (id) => {
    caseNavLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const caseSectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) setActiveCaseSection(visible.target.id);
    },
    { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.1, 0.35] }
  );

  caseSections.forEach((section) => caseSectionObserver.observe(section));
  setActiveCaseSection(caseSections[0]?.id);
}
