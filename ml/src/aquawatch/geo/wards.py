from pathlib import Path

import geopandas as gpd

REQUIRED_COLUMNS = {"ward_name", "lga_name", "state"}


class WardBoundaryValidationError(ValueError):
    pass


def load_ward_boundaries(geojson_path: Path, target_states: list[str] | None = None) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(geojson_path)

    missing_columns = REQUIRED_COLUMNS - set(gdf.columns)
    if missing_columns:
        raise WardBoundaryValidationError(
            f"ward boundaries file is missing required columns: {sorted(missing_columns)}"
        )

    if gdf.crs is None:
        raise WardBoundaryValidationError("ward boundaries file has no CRS defined")

    gdf = gdf.to_crs(epsg=4326)
    gdf = gdf[gdf.geometry.notnull() & gdf.geometry.is_valid]

    if target_states:
        gdf = gdf[gdf["state"].isin(target_states)]

    return gdf.reset_index(drop=True)


def ward_centroid_lonlat(ward_geometry) -> tuple[float, float]:
    centroid = ward_geometry.centroid
    return centroid.x, centroid.y
