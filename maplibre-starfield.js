/**
 * MapLibreStarryBackground.js
 * A modular starfield and atmospheric glow for MapLibre Globe
 * Based on D3.js for rich visual effects
 */

class MapLibreStarryBackground {
  constructor(options = {}) {
    // Default configuration - simplified to only use blue
    this.config = {
      starCount: options.starCount || 1500,
      glowIntensity: options.glowIntensity || 1.0,
      // Simplified color scheme with only blue
      glowColors: {
        inner: "rgba(120, 180, 255, 0.9)",
        middle: "rgba(100, 150, 255, 0.7)",
        outer: "rgba(70, 120, 255, 0.4)",
        fade: "rgba(40, 80, 220, 0)"
      }
    };

    this.mapInstance = null;
    this.stars = [];
    this.lastBearing = 0;
    this.lastPitch = 0;
    this.lastCenter = null;
    this.glowGradientId = "globe-glow-gradient";
    this.containers = {
      starfield: null,
      glow: null
    };
    this.elements = {
      starfieldSvg: null,
      glowSvg: null,
      glowCircle: null
    };
  }

  /**
   * Setup the required DOM elements and attach to existing containers
   * @param {string} starfieldContainerId - DOM ID for starfield container
   * @param {string} glowContainerId - DOM ID for glow container
   */
  setupContainers(starfieldContainerId, glowContainerId) {
    // Get container elements
    this.containers.starfield = document.getElementById(starfieldContainerId);
    this.containers.glow = document.getElementById(glowContainerId);

    if (!this.containers.starfield || !this.containers.glow) {
      console.error("Starfield or glow container not found");
      return false;
    }

    // Set container styles if needed
    this.containers.starfield.style.position = "absolute";
    this.containers.starfield.style.top = "0";
    this.containers.starfield.style.left = "0";
    this.containers.starfield.style.width = "100%";
    this.containers.starfield.style.height = "100%";
    this.containers.starfield.style.zIndex = "1";
    this.containers.starfield.style.pointerEvents = "none";

    this.containers.glow.style.position = "absolute";
    this.containers.glow.style.top = "0";
    this.containers.glow.style.left = "0";
    this.containers.glow.style.width = "100%";
    this.containers.glow.style.height = "100%";
    this.containers.glow.style.zIndex = "2";
    this.containers.glow.style.pointerEvents = "none";

    return true;
  }

  /**
   * Create the starfield using D3
   */
  createStarfield() {
    if (!this.containers.starfield) return;

    // Clear any existing content
    this.containers.starfield.innerHTML = '';
    
    // Get dimensions
    const width = this.containers.starfield.clientWidth;
    const height = this.containers.starfield.clientHeight;

    // Create SVG with D3
    const svg = d3.select(this.containers.starfield)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background-color", "transparent");

    this.elements.starfieldSvg = svg;

    // Random position function
    const randomStarPosition = () => {
      return {
        pos: {
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 50,
        },
        initialPos: {}, // Will store initial position for reference
        hue: 0.6,
        size: Math.random() * 2 + 0.5,
      };
    };

    // Convert HSL to RGB
    const hslToRgb = (h, s, l) => {
      let r, g, b;

      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    };

    // Helper function to map range
    const mapRange = (value, inMin, inMax, outMin, outMax) => {
      return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    };

    // Generate star positions
    this.stars = []; // Reset global stars array
    for (let i = 0; i < this.config.starCount; i++) {
      const star = randomStarPosition();
      // Store initial position for reference during movement
      star.initialPos = { ...star.pos };
      const brightness = Math.random() * 0.6 + 0.4;
      star.color = hslToRgb(star.hue, 0.2, brightness);
      this.stars.push(star);
    }

    // Sort stars by z-coordinate
    this.stars.sort((a, b) => a.pos.z - b.pos.z);

    // Create star elements
    const starElements = svg
      .selectAll(".star")
      .data(this.stars)
      .enter()
      .append("circle")
      .attr("class", "star")
      .attr("cx", (d) => d.pos.x)
      .attr("cy", (d) => d.pos.y)
      .attr("r", (d) => d.size)
      .style("fill", (d) => d.color)
      .style("opacity", (d) => mapRange(d.pos.z, 0, 50, 0.4, 1));

    // Add twinkling effect
    const twinkle = () => {
      svg.selectAll(".star").each(function (d, i) {
        const duration = 1000 + (i % 5) * 500 + Math.random() * 2000;
        d3.select(this)
          .transition()
          .duration(duration)
          .style("opacity", () => 0.4 + Math.random() * 0.6)
          .on("end", function () {
            d3.select(this).call(() => twinkleStar(this));
          });
      });
    };

    const twinkleStar = (star) => {
      d3.select(star)
        .transition()
        .duration(1000 + Math.random() * 2000)
        .style("opacity", () => 0.4 + Math.random() * 0.6)
        .on("end", function () {
          twinkleStar(this);
        });
    };

    // Start twinkling
    twinkle();

    return svg;
  }

  /**
   * Create the globe glow effect
   */
  createGlobeGlow() {
    if (!this.containers.glow) return;

    // Clear existing content
    this.containers.glow.innerHTML = '';

    // Get dimensions
    const width = this.containers.glow.clientWidth;
    const height = this.containers.glow.clientHeight;

    // Create SVG with D3
    const svg = d3.select(this.containers.glow)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background-color", "transparent");

    this.elements.glowSvg = svg;

    // Create defs for the gradient
    const defs = svg.append("defs");
    
    // Create the gradient
    this.updateGlowGradient(defs);

    // Calculate initial radius based on current map state or fallback to viewport size
    let initialRadius;
    if (this.mapInstance) {
      initialRadius = this.calculateGlowRadius(this.mapInstance);
    } else {
      // Fallback calculation if no map instance is available yet
      const viewportSize = Math.min(width, height);
      initialRadius = viewportSize * 0.1; // 10% of the viewport
    }

    // Create the glow circle
    const glowCircle = svg
      .append("circle")
      .attr("class", "globe-glow")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", initialRadius)
      .style("fill", `url(#${this.glowGradientId})`)
      .style("filter", `blur(${initialRadius * 0.1}px)`)
      .style("opacity", this.config.glowIntensity);

    this.elements.glowCircle = glowCircle;

    return svg;
  }

  /**
   * Update the glow gradient
   * @param {Object} defs - D3 selection for SVG defs
   */
  updateGlowGradient(defs) {
    // Remove existing gradient if it exists
    defs.select(`#${this.glowGradientId}`).remove();
    
    // Get color values from config
    const colors = this.config.glowColors;
    
    // Create new gradient
    const gradient = defs
      .append("radialGradient")
      .attr("id", this.glowGradientId)
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    // Define gradient stops based on selected color
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colors.inner);
    gradient
      .append("stop")
      .attr("offset", "30%")
      .attr("stop-color", colors.middle);
    gradient
      .append("stop")
      .attr("offset", "60%")
      .attr("stop-color", colors.outer);
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colors.fade);
  }

  /**
   * Update star positions based on map movement
   * @param {number} bearingDelta - Change in map bearing
   * @param {number} pitchDelta - Change in map pitch
   * @param {number} lngDelta - Change in map longitude
   */
  updateStarPositions(bearingDelta, pitchDelta, lngDelta) {
    if (!this.elements.starfieldSvg) return;

    const svg = this.elements.starfieldSvg;
    const width = parseInt(svg.attr("width"));
    const height = parseInt(svg.attr("height"));

    // Movement factors - adjust these to control how much stars move
    const bearingFactor = 0.5; // How much bearing affects horizontal movement
    const pitchFactor = 0.5; // How much pitch affects vertical movement
    const lngFactor = 2.0; // How much longitude change affects horizontal movement

    // Update each star's position
    svg.selectAll(".star").each(function (d, i) {
      // Calculate new position based on map movement
      // Using modulo to wrap around screen edges
      let newX =
        (d.pos.x + bearingDelta * bearingFactor + lngDelta * lngFactor) %
        width;
      let newY = (d.pos.y + pitchDelta * pitchFactor) % height;

      // Handle negative values by wrapping to the other side
      if (newX < 0) newX += width;
      if (newY < 0) newY += height;

      // Update star data
      d.pos.x = newX;
      d.pos.y = newY;

      // Update visual position
      d3.select(this).attr("cx", newX).attr("cy", newY);
    });
  }

  /**
   * Calculate the globe radius in pixels
   * @param {number} worldSize - Map world size
   * @param {number} latitudeDegrees - Current latitude
   * @returns {number} - The globe radius in pixels
   */
  getGlobeRadiusPixels(worldSize, latitudeDegrees) {
    // Scale globe based on latitude to maintain consistent zoom levels
    return worldSize / (2.0 * Math.PI) / Math.cos(latitudeDegrees * Math.PI / 180);
  }

  /**
   * Calculate the appropriate radius for the glow based on zoom level
   * @param {Object} map - MapLibre map instance
   * @returns {number} - The calculated radius
   */
  calculateGlowRadius(map) {
    if (!map) return 200; // Default fallback value
    
    const transform = map._getTransformForUpdate();
    if (!transform) return 200; // Another fallback if transform is not available
    
    const radius = this.getGlobeRadiusPixels(transform.worldSize, transform.center.lat);
    return Math.ceil(radius * 1.5);
  }

  /**
   * Update the glow effect based on map state
   * @param {Object} map - MapLibre map instance
   */
  updateGlobeGlow(map) {
    if (!this.elements.glowCircle || !map) return;
    
    const width = this.containers.glow.clientWidth;
    const height = this.containers.glow.clientHeight;
    
    // Calculate new glow radius
    const glowRadius = this.calculateGlowRadius(map);
    
    // Update glow position and size
    this.elements.glowCircle
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", glowRadius)
      .style("filter", `blur(${glowRadius * 0.1}px)`)
      .style("opacity", this.config.glowIntensity);
  }

  /**
   * Handle window resize events
   * @param {Object} map - MapLibre map instance
   */
  handleResize(map) {
    if (!map) return;
    
    // Recreate visual elements
    this.createStarfield();
    this.createGlobeGlow();
    
    // Update the glow based on current map state
    this.updateGlobeGlow(map);
  }

  /**
   * Attach the starry background to a MapLibre map
   * @param {Object} map - MapLibre map instance
   * @param {string} starfieldContainerId - DOM ID for starfield container
   * @param {string} glowContainerId - DOM ID for glow container
   */
  attachToMap(map, starfieldContainerId, glowContainerId) {
    if (!map) {
      console.error("MapLibre map instance is required");
      return;
    }

    this.mapInstance = map;
    
    // Setup containers
    if (!this.setupContainers(starfieldContainerId, glowContainerId)) {
      return;
    }
    
    // Make sure the map canvas has a transparent background
    const canvas = map.getCanvas();
    if (canvas) {
      canvas.style.background = "transparent";
    }
    
    // Create starfield and glow
    this.createStarfield();
    this.createGlobeGlow();
    
    // Store initial values for comparison
    this.lastCenter = map.getCenter();
    this.lastBearing = map.getBearing();
    this.lastPitch = map.getPitch();
    
    // Set up move event listener
    map.on("move", () => {
      const currentBearing = map.getBearing();
      const currentPitch = map.getPitch();
      const currentCenter = map.getCenter();

      // Calculate movement deltas
      const bearingDelta = currentBearing - this.lastBearing;
      const pitchDelta = currentPitch - this.lastPitch;
      const lngDelta = currentCenter.lng - this.lastCenter.lng;

      // Update star positions
      this.updateStarPositions(bearingDelta, pitchDelta, lngDelta);
      
      // Update glow
      this.updateGlobeGlow(map);

      // Save current values for next comparison
      this.lastBearing = currentBearing;
      this.lastPitch = currentPitch;
      this.lastCenter = currentCenter;
    });
    
    // Handle zoom events
    map.on("zoom", () => {
      this.updateGlobeGlow(map);
    });
    
    // Handle idle events
    map.on("idle", () => {
      this.updateGlobeGlow(map);
    });
    
    // Handle window resize
    window.addEventListener("resize", () => {
      this.handleResize(map);
    });
    
    // Update glow when style is loaded
    map.on("style.load", () => {
      setTimeout(() => {
        this.updateGlobeGlow(map);
      }, 100);
    });
    
    // Update everything after a short delay to ensure proper positioning
    setTimeout(() => {
      this.updateGlobeGlow(map);
    }, 200);
  }
  
  /**
   * Update configuration options
   * @param {Object} options - New configuration options
   */
  updateConfig(options = {}) {
    // Update config with new options
    if (options.glowIntensity !== undefined) {
      this.config.glowIntensity = options.glowIntensity;
    }
    
    if (options.starCount !== undefined) {
      this.config.starCount = options.starCount;
    }
    
    // Update visual elements if they exist
    if (this.elements.glowCircle) {
      this.elements.glowCircle.style("opacity", this.config.glowIntensity);
    }
    
    // Update everything if map instance exists
    if (this.mapInstance) {
      this.updateGlobeGlow(this.mapInstance);
    }
  }
}