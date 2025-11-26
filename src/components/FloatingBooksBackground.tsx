import { useEffect, useRef } from "react";

declare global {
  interface Window {
    THREE?: any;
    TweenMax?: any;
  }
}

const BOOK_SCRIPTS = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/100/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.2/TweenMax.min.js",
  "https://unpkg.com/three@0.84.0/examples/js/controls/OrbitControls.js"
];

const FloatingBooksBackground = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanupFn: (() => void) | null = null;

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.body.appendChild(script);
      });

    const loadAllScripts = async () => {
      for (const src of BOOK_SCRIPTS) {
        // eslint-disable-next-line no-await-in-loop
        await loadScript(src);
      }
    };

    const injectStyles = () => {
      if (document.getElementById("floating-books-style")) return;
      const style = document.createElement("style");
      style.id = "floating-books-style";
      style.innerHTML = `
        .floating-books-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .floating-books-canvas {
          position: absolute;
          inset: 0;
        }
        .floating-books-noise {
          position: absolute;
          inset: -8rem;
          background-image: url("https://i.imgur.com/N0STPcn.png");
          opacity: 0.25;
          animation: floatingBooksNoise 1.2s steps(2) infinite;
        }
        @keyframes floatingBooksNoise {
          0% { transform: translate3d(0, 8rem, 0); }
          50% { transform: translate3d(-6rem, -4rem, 0); }
          100% { transform: translate3d(-4rem, 0, 0); }
        }
      `;
      document.head.appendChild(style);
    };

    const initScene = () => {
      const THREE = window.THREE;
      if (!THREE || !containerRef.current) return;

      const container = containerRef.current;
      const scene = new THREE.Scene();
      const height = container.clientHeight || window.innerHeight;
      const width = container.clientWidth || window.innerWidth;
      const camera = new THREE.PerspectiveCamera(35, width / height, 1, 1000);
      camera.position.set(0, 0, 10);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;

      const hemiLight = new THREE.HemisphereLight(0xd7dddd, 0x101010, 1);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(10, 20, 20);
      dirLight.castShadow = true;
      scene.add(hemiLight);
      scene.add(dirLight);

      const group = new THREE.Group();

      const CreateBook = function () {
        this.mesh = new THREE.Object3D();
        const geo_cover = new THREE.BoxGeometry(2.4, 3, 0.05);
        const lmo_cover = new THREE.BoxGeometry(0.05, 3, 0.59);
        const ppr_cover = new THREE.BoxGeometry(2.3, 2.8, 0.5);
        const mat = new THREE.MeshPhongMaterial({ color: 0x475b47 });
        const mat_paper = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const cover1 = new THREE.Mesh(geo_cover, mat);
        const cover2 = new THREE.Mesh(geo_cover, mat);
        const lomo = new THREE.Mesh(lmo_cover, mat);
        const paper = new THREE.Mesh(ppr_cover, mat_paper);
        [cover1, cover2, lomo, paper].forEach((mesh) => {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        });
        cover1.position.z = 0.3;
        cover2.position.z = -0.3;
        lomo.position.x = 1.2;
        this.mesh.add(cover1, cover2, lomo, paper);
      };

      const placedBooks: any[] = [];
      const isTooClose = (obj: any, others: any[], minDistance = 1.3) => {
        const newPos = obj.position;
        return others.some((existing) => {
          const dx = newPos.x - existing.position.x;
          const dy = newPos.y - existing.position.y;
          const dz = newPos.z - existing.position.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) < minDistance;
        });
      };

      for (let i = 0; i < 12; i += 1) {
        const object = new (CreateBook as any)();
        const s = 0.1 + Math.random() * 0.4;
        object.mesh.scale.set(s, s, s);

        let tries = 0;
        do {
          object.mesh.position.x = (Math.random() - 0.5) * 4;
          object.mesh.position.y = (Math.random() - 0.5) * 4;
          object.mesh.position.z = (Math.random() - 0.5) * 4;
          tries += 1;
        } while (isTooClose(object.mesh, placedBooks) && tries < 20);

        object.mesh.rotation.x = Math.random() * Math.PI * 2;
        object.mesh.rotation.y = Math.random() * Math.PI * 2;
        object.mesh.rotation.z = Math.random() * Math.PI * 2;

        if (window.TweenMax) {
          window.TweenMax.to(object.mesh.rotation, 8 + Math.random() * 8, {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5,
            z: (Math.random() - 0.5) * 0.5,
            yoyo: true,
            repeat: -1,
            ease: (window as any).Sine.easeInOut,
            delay: 0.05 * i
          });
        }

        group.add(object.mesh);
        placedBooks.push(object.mesh);
      }
      group.position.x = 2;
      scene.add(group);

      const handleResize = () => {
        if (!container) return;
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
      };

      const animate = () => {
        if (!mounted) return;
        group.rotation.x -= 0.003;
        group.rotation.y -= 0.003;
        group.rotation.z -= 0.003;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();
      window.addEventListener("resize", handleResize);

      cleanupFn = () => {
        mounted = false;
        window.removeEventListener("resize", handleResize);
        controls.dispose();
        renderer.dispose();
        if (typeof scene.clear === "function") {
        scene.clear();
        } else {
          while (scene.children.length > 0) {
            const child = scene.children[0];
            scene.remove(child);
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose?.();
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat?.dispose?.());
              } else {
                child.material?.dispose?.();
              }
            }
          }
        }
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    };

    loadAllScripts()
      .then(() => {
        if (!mounted) return;
        injectStyles();
        initScene();
      })
      .catch(() => {
        // fail silently
      });

    return () => {
      mounted = false;
      if (cleanupFn) cleanupFn();
    };
  }, []);

  return (
    <div className="floating-books-layer" aria-hidden ref={containerRef}>
      <div className="floating-books-canvas" />
      <div className="floating-books-noise" />
    </div>
  );
};

export default FloatingBooksBackground;

