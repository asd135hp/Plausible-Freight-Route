'use client';

import { Loader } from "@googlemaps/js-api-loader";
import { useRef, useState } from "react";
import styles from "./page.module.css";
import geom from "../../public/geometries.json";

var map: google.maps.Map;

interface MapProps {
  loader: Loader,
  divNode: HTMLElement,
  routeSelection: number
}

interface RouteProps {
  loader: Loader,
  routeSelection: number,
}

async function loadMap({ loader, divNode } : MapProps){
  const { Map } = await loader.importLibrary("maps");
  map = new Map(divNode, {
      center: { lat: -23.6980, lng: 133.8807 },
      zoom: 4,
  });
}

async function plotRoute({ loader, routeSelection }: RouteProps){
  const { DirectionsService, DirectionsRenderer, DirectionsStatus } = await loader.importLibrary("routes");
  const routeGeom = geom[routeSelection].route_geom
  const segments = routeGeom.substring(12, routeGeom.length - 2).split(",").map(latStr => latStr.trim().split(' '))
  const directionsService = new DirectionsService();
  let rendererOptions = {
    preserveViewport: true,
    suppressMarkers: true,
    routeIndex: 0
  }

  segments.map((segment, i) => {
    const request = {
      origin: segment[0],
      destination: segment[1],
      travelMode: google.maps.TravelMode.DRIVING
    }

    const directionsDisplay = new DirectionsRenderer({ ...rendererOptions, routeIndex: i })
    directionsDisplay.setMap(map)

    directionsService.route(request, (result, status) =>{
      console.log(result)

      if(status == DirectionsStatus.OK){
        directionsDisplay.setDirections(result);
      }
    })
  })
}

export default function Home() {
  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_API_KEY ?? "",
    version: "weekly",
  });

  const [routeSelection, setRouteSelection] = useState(0);
  return (
    <main className={styles.main}>
      <div className={styles.selections}>
        <select value={routeSelection} onChange={e => setRouteSelection(parseInt(e.target.value))}>
          { geom.map((data, i) => <option value={i} key={i}>{data.route_name}</option>)}
        </select>
      </div>
      <div className={styles.map} ref={node => {
        if(map == null) loadMap({ loader, divNode: node as HTMLElement, routeSelection }).catch(reason => console.log(reason))
        plotRoute({ loader, routeSelection })
      }}></div>
    </main>
  )
}
