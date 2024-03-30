import mapboxgl from "mapbox-gl";


export default class WaveMarker {
    map: mapboxgl.Map | null;
    center: number[];
    marker: mapboxgl.Marker | null = null;
    size: number = 50;
    curTime: number = 0;
    constructor(map: mapboxgl.Map | null, center: number[]) {
        this.map = map;
        this.center = center;
        this.render();
        

        const animate = (time: number) => {
            const deltaTime = time - this.curTime;
            if (this.marker != null && this.map != null) {
                const el = this.marker.getElement();
                //scale down on zoom out
                const scale = Math.pow(2, this.map.getZoom() - 7);
                el.style.width = `${this.size*scale}px`;
                el.style.height = `${this.size*scale}px`;
            }

            this.size += deltaTime * 0.01;
            this.curTime = time;
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }
    render() {
        if (this.map == null) return;
        // create DOM element for the marker
        const waveGempa = document.createElement('div');
        waveGempa.classList.add('marker-gempa-wave');
        const waveMarker = new mapboxgl.Marker(waveGempa)
        .setLngLat([this.center[0], this.center[1]])
        .addTo(this.map)
        
        this.marker = waveMarker;

        //scale based on zoom
        
        

    }
}