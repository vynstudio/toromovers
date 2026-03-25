/**
 * animate.js — Toro Movers scroll reveal & interaction system
 * Mobile-first. No dependencies. ~3KB.
 * Techniques: IntersectionObserver, requestAnimationFrame, CSS class toggling
 */
(function () {
  'use strict';

  /* ── 1. RESPECT REDUCED MOTION ─────────────────────── */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    // Make everything visible immediately
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      el.style.opacity = '1';
    });
    return;
  }

  /* ── 2. SCROLL REVEAL — IntersectionObserver ────────── */
  // Threshold: element is 12% visible before triggering
  // rootMargin: starts slightly before entering viewport — snappier feel on mobile
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target); // fire once
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  // Observe all [data-reveal] elements
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ── 3. STAGGER CHILDREN ────────────────────────────── */
  // Finds containers with [data-stagger] and sets delay on each child
  document.querySelectorAll('[data-stagger]').forEach(function (container) {
    var children = container.querySelectorAll('[data-reveal]');
    children.forEach(function (child, i) {
      child.setAttribute('data-delay', Math.min(i + 1, 6));
    });
  });

  /* ── 4. STAT COUNTER ANIMATION ──────────────────────── */
  // Counts up numbers when .stat-number enters viewport
  function animateCounter(el) {
    var raw = el.textContent.trim();
    // Parse: extract leading number, keep suffix like '+', '★', '$'
    var match = raw.match(/^(\$?)(\d+\.?\d*)(.*)/);
    if (!match) return;

    var prefix = match[1] || '';
    var end    = parseFloat(match[2]);
    var suffix = match[3] || '';
    var isFloat = match[2].indexOf('.') !== -1;
    var duration = 1400; // ms
    var startTime = null;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var current = easeOut(progress) * end;
      var display = isFloat
        ? current.toFixed(1)
        : Math.floor(current).toString();
      el.textContent = prefix + display + suffix;
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  var statObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-number').forEach(function (el) {
    statObserver.observe(el);
  });

  /* ── 5. PRICING CARD TILT on hover (desktop only) ───── */
  var isMobile = window.innerWidth < 768;
  if (!isMobile) {
    document.querySelectorAll('.pricing-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 to 0.5
        var y = (e.clientY - rect.top)  / rect.height - 0.5;
        var tiltX = (-y * 4).toFixed(2); // max 4deg
        var tiltY = ( x * 4).toFixed(2);
        card.style.transform = 'translateY(-4px) perspective(600px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ── 6. REVIEW CARD — parallax-lite on scroll ────────── */
  // Only on desktop — skips on mobile for performance
  if (!isMobile && window.innerWidth >= 1024) {
    var reviewCards = document.querySelectorAll('.review-card');
    if (reviewCards.length) {
      var reviewSection = reviewCards[0].closest('section');
      window.addEventListener('scroll', function () {
        if (!reviewSection) return;
        var rect = reviewSection.getBoundingClientRect();
        var progress = 1 - (rect.top / window.innerHeight);
        if (progress < 0 || progress > 2) return;
        reviewCards.forEach(function (card, i) {
          var offset = (i % 2 === 0 ? 1 : -1) * progress * 6;
          card.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
        });
      }, { passive: true });
    }
  }

  /* ── 7. HERO TEXT — play immediately (above fold) ───── */
  // Hero elements already have CSS animation classes applied
  // Nothing to do — CSS handles it on page load

  /* ── 8. BUTTON RIPPLE on tap (mobile-first) ─────────── */
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('pointerdown', function (e) {
      var existing = btn.querySelector('.btn-ripple');
      if (existing) existing.remove();

      var ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 1.5;
      ripple.style.cssText = [
        'position:absolute',
        'border-radius:50%',
        'pointer-events:none',
        'background:rgba(255,255,255,0.25)',
        'width:' + size + 'px',
        'height:' + size + 'px',
        'left:' + (e.clientX - rect.left - size / 2) + 'px',
        'top:' + (e.clientY - rect.top  - size / 2) + 'px',
        'transform:scale(0)',
        'animation:ripple-burst 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
      ].join(';');
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
    });
  });

  /* Inject ripple keyframe once */
  if (!document.getElementById('ripple-style')) {
    var s = document.createElement('style');
    s.id = 'ripple-style';
    s.textContent = '@keyframes ripple-burst{to{transform:scale(1);opacity:0;}}';
    document.head.appendChild(s);
  }

  /* ── 9. SCROLL PROGRESS INDICATOR (thin top bar) ─────── */
  var progressBar = document.createElement('div');
  progressBar.id = 'scroll-progress';
  progressBar.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'height:3px',
    'width:0%',
    'background:var(--color-accent)',
    'z-index:9999',
    'transition:width 0.1s linear',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', function () {
    var scrolled = window.scrollY;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    var pct = total > 0 ? (scrolled / total * 100).toFixed(1) : 0;
    progressBar.style.width = pct + '%';
  }, { passive: true });

  /* ── 10. SECTION HEADING — word-by-word reveal ──────── */
  // Only for .section-title elements with data-reveal
  // Splits into word spans for staggered entrance
  // Only on index page (where sections are rich enough to justify it)
  var isIndex = window.location.pathname.match(/\/(index\.html)?$/);
  if (isIndex) {
    document.querySelectorAll('.section-title[data-reveal]').forEach(function (heading) {
      // Only split plain-text headings — skip if they contain <em> children
      // (to avoid breaking the orange accent words)
      var hasEM = heading.querySelector('em');
      if (hasEM) return; // leave alone — CSS handles the whole element

      var words = heading.textContent.trim().split(/\s+/);
      heading.innerHTML = words.map(function (word, i) {
        return '<span style="display:inline-block;opacity:0;transform:translateY(12px);transition:opacity 0.4s cubic-bezier(0.16,1,0.3,1) ' + (i * 60) + 'ms,transform 0.4s cubic-bezier(0.16,1,0.3,1) ' + (i * 60) + 'ms;">' + word + '&nbsp;</span>';
      }).join('');

      // When the heading itself gets is-visible, animate all word spans
      var wo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            heading.querySelectorAll('span').forEach(function (span) {
              span.style.opacity = '1';
              span.style.transform = 'translateY(0)';
            });
            wo.unobserve(heading);
          }
        });
      }, { threshold: 0.3 });
      wo.observe(heading);
    });
  }

})();
