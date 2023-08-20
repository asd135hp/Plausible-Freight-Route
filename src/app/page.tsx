'use client';

import { Loader } from "@googlemaps/js-api-loader";
import { useState } from "react";
import { Point, makeHull } from "../convexHull";
import styles from "./page.module.css";
import geom from "../../public/geometries.json";
import intermodal from "../../public/intermodal_terminals.json";

var map: google.maps.Map;
var plottedPoly: google.maps.Polyline[] = [];
var routeRenderer: google.maps.DirectionsRenderer[] = [];
var terminalRenderer: google.maps.DirectionsRenderer[] = []
var colors: string[] = ["#51b0fd", "#bbbdbf", "#bbbdbf", "#bbbdbf", "#bbbdbf", "#bbbdbf"]

interface MapProps {
  loader: Loader,
  divNode: HTMLElement,
  routeSelection: number
}

interface RouteProps {
  loader: Loader,
  routeSelection: number
  //clearPreviousRoute: boolean,
  //showWaypoints: boolean
}

interface LatLngPoint extends Point {
  lat: number,
  lng: number
}

const arrToLatLng = (arr: number[]) => ({ lat: arr[1], lng: arr[0] })

async function loadMap({ loader, divNode } : MapProps){
  const { Map } = await loader.importLibrary("maps");
  map = new Map(divNode, {
    center: { lat: -23.6980, lng: 133.8807 },
    zoom: 4,
  });
}

async function initializeRoute({ loader, routeSelection }: RouteProps) {
  const { DirectionsService, DirectionsRenderer, DirectionsStatus } = await loader.importLibrary("routes");
  const directionsService = new DirectionsService();

  geom.map(geomObj => {
    const routeGeom = geomObj.route_geom
    const waypoints = routeGeom.substring(12, routeGeom.length - 2)
      .split(",")
      .map(latStr => arrToLatLng(latStr.trim().split(' ').map(val => parseFloat(val)))) as { lat: number, lng: number }[]

    // for each road segment represented by a set of latLng object, plot that segment into the map
    const request: google.maps.DirectionsRequest = {
      origin: waypoints[0],
      destination: waypoints[waypoints.length - 1],
      waypoints: waypoints.slice(1, -2).map(latLng => ({ location: latLng, stopover: false })),
      travelMode: google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false,
      avoidFerries: false
    }

    directionsService.route(request, (result, status) =>{
      if(result && status == DirectionsStatus.OK){
        routeRenderer.push(new DirectionsRenderer({
          directions: result,
          routeIndex: 0,
          polylineOptions: {
            clickable: true,
            strokeColor: "#51b0fd",
            strokeOpacity: 1,
            strokeWeight: 5,
            visible: true,
            zIndex: 100
          }
        }))
      }
    })
  })
}

function toggleRoute(routeIndex: number, isLoad: boolean){
  routeRenderer[routeIndex].setMap(isLoad ? map : null)
}

/*
async function plotRoute({ loader, routeSelection, clearPreviousRoute, showWaypoints }: RouteProps){
  // clear previous routes since the plotted lines will polute the map
  if(clearPreviousRoute){
    plottedPoly.map(poly => poly.setMap(null))
    renderer?.setMap(null)
    plottedPoly = [];
  }

  const { DirectionsService, DirectionsRenderer, DirectionsStatus } = await loader.importLibrary("routes");
  const routeGeom = geom[routeSelection].route_geom
  const directionsService = new DirectionsService();

  const waypoints = routeGeom.substring(12, routeGeom.length - 2)
    .split(",")
    .map(latStr => arrToLatLng(latStr.trim().split(' ').map(val => parseFloat(val)))) as { lat: number, lng: number }[]

  // for each road segment represented by a set of latLng object, plot that segment into the map
  const request: google.maps.DirectionsRequest = {
    origin: waypoints[0],
    destination: waypoints[waypoints.length - 1],
    waypoints: waypoints.slice(1, -2).map(latLng => ({ location: latLng, stopover: false })),
    travelMode: google.maps.TravelMode.DRIVING,
    provideRouteAlternatives: true,
    avoidHighways: false,
    avoidTolls: false,
    avoidFerries: false
  }

  // remove waypoints if no show
  if(!showWaypoints) delete request.waypoints

  directionsService.route(request, (result, status) =>{
    console.log(result)

    if(result && status == DirectionsStatus.OK){
      renderer = new DirectionsRenderer({ map, directions: result, routeIndex: 0 })

      // courtesy to https://stackoverflow.com/questions/32831558/google-map-alternative-roads-show-with-different-colour
      for (var j = result.routes.length - 1, polyArray = []; j >= 0; j--) {
        var path = new google.maps.MVCArray();
        polyArray.push(
          new google.maps.Polyline({
            map,
            strokeColor: colors[j],
            strokeOpacity: 1.0,
            strokeWeight: 5
          })
        );
        polyArray[polyArray.length - 1].setPath(path);
        for (var i = 0, len = result.routes[j].overview_path.length; i < len; i++) {
          path.push(result.routes[j].overview_path[i]);
        }

        if(clearPreviousRoute) plottedPoly.push(...polyArray)
      }
    }
  })

  map.panTo(waypoints[Math.round(waypoints.length / 2)])
  map.setZoom(11)
} */

async function initializeTerminals(loader: Loader){
  const { DirectionsService, DirectionsRenderer, DirectionsStatus } = await loader.importLibrary("routes");
  const directionsService = new DirectionsService();

  function isFlatArray(arr: number[] | number[][]){
    for(let val of arr){
      if(Array.isArray(val)) return false
    }
    return true
  }

  function convertToPoint(arr: number[][] | number[][][]) {
    let result: LatLngPoint[] = []
    for(let inner of arr){
      if(!isFlatArray(inner)) result.push(...((inner as number[][]).map(pointArr => {
        return { lat: pointArr[1], lng: pointArr[0], x: pointArr[0], y: pointArr[1] }
      })))

      let newArr = inner as number[]
      result.push({ lat: newArr[1], lng: newArr[0], x: newArr[0], y: newArr[1] })
    }
    return result
  }

  function plot(coords: LatLngPoint[]){
    // for each road segment represented by a set of latLng object, plot that segment into the map
    const request: google.maps.DirectionsRequest = {
      origin: coords[0],
      destination: coords[0],
      waypoints: coords.slice(1).map(point => ({ location: point, stopover: false })),
      travelMode: google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false,
      avoidFerries: false
    }

    directionsService.route(request, (result, status) => {
      if(result && status == DirectionsStatus.OK){
        terminalRenderer.push(new DirectionsRenderer({
          map,
          directions: result,
          routeIndex: 0,
          polylineOptions: {
            clickable: true,
            strokeColor: "black",
            strokeOpacity: 0.5,
            strokeWeight: 5,
            visible: true,
            zIndex: -1
          }
        }))
      }
    })    
  }

  intermodal.features.map(feature => {
    const coordinates = feature.geometry.coordinates
    coordinates.map(coords => plot(makeHull(convertToPoint(coords))))
  })
}

function toggleTerminals(isLoad: boolean){
  terminalRenderer.map(renderer => renderer.setMap(isLoad ? map : null))
}

export default function Home() {
  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_API_KEY ?? "",
    version: "weekly",
  });

  const [routeSelection, setRouteSelection] = useState(0);
  const [checked, setChecked] = useState(true)

  return (
    <main className={styles.main_row}>
      <div className={styles.main}>
        <div className={styles.selections}>
          <input
            type="checkbox"
            id="intermodal_checkbox"
            onChange={e => { toggleTerminals(e.target.checked), setChecked(e.target.checked) }}
            ref={node => { if(node) node.checked = checked }}
          />
          <label htmlFor="intermodal_checkbox">Show intermodal terminals</label>
        </div>
        <div className={styles.map} ref={node => {
          // initialization
          if(map == null) {
            loadMap({ loader, divNode: node as HTMLElement, routeSelection })
              .catch(reason => console.log(reason))
            initializeTerminals(loader)
          }
        }}></div>
      </div>
      <div className={styles.checkboxList}>
        <span>National freight congestion route:</span>
        {
          geom.map((data, i) => {
            let id = `${data.route_name}${i}`
            return <p key={id}>
              <input type="checkbox" onChange={e => {
                if(e.target.checked){
                  toggleRoute(i, e.target.checked)
                }
              }} id={id}/>
              <label htmlFor={id}>{data.route_name}</label>
            </p>
          })
        }
        <select value={routeSelection} onChange={e => setRouteSelection(parseInt(e.target.value))}>
        </select>
      </div>
    </main>
  )
}

