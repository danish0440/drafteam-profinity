#!/usr/bin/env python3
"""
OSM to DXF Converter
Converts OpenStreetMap data to AutoCAD DXF format with proper layer organization.

Author: OSM to DXF Converter
Version: 1.0.0
"""

import argparse
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

import osmium
import ezdxf
from ezdxf import colors
from pyproj import Transformer


class OSMNode:
    """Represents an OSM node with coordinates and tags."""
    
    def __init__(self, id: int, lat: float, lon: float, tags: Dict[str, str] = None):
        self.id = id
        self.lat = lat
        self.lon = lon
        self.tags = tags or {}
        self.x = None  # Projected coordinates
        self.y = None


class OSMWay:
    """Represents an OSM way with node references and tags."""
    
    def __init__(self, id: int, nodes: List[int], tags: Dict[str, str] = None):
        self.id = id
        self.nodes = nodes
        self.tags = tags or {}
        self.geometry = []  # Will store projected coordinates


class OSMRelation:
    """Represents an OSM relation with members and tags."""
    
    def __init__(self, id: int, members: List[Tuple[str, int, str]], tags: Dict[str, str] = None):
        self.id = id
        self.members = members  # (type, ref, role)
        self.tags = tags or {}


class LayerMapper:
    """Maps OSM tags to DXF layers with styling."""
    
    def __init__(self, use_colors: bool = True, plan_type: str = 'key-plan'):
        self.plan_type = plan_type
        self.layer_config = {
            'highway': {
                'motorway': {'layer': 'HIGHWAY_MOTORWAY', 'color': colors.RED, 'lineweight': 100},
                'trunk': {'layer': 'HIGHWAY_TRUNK', 'color': colors.RED, 'lineweight': 80},
                'primary': {'layer': 'HIGHWAY_PRIMARY', 'color': colors.YELLOW, 'lineweight': 60},
                'secondary': {'layer': 'HIGHWAY_SECONDARY', 'color': colors.CYAN, 'lineweight': 40},
                'tertiary': {'layer': 'HIGHWAY_TERTIARY', 'color': colors.GREEN, 'lineweight': 30},
                'residential': {'layer': 'HIGHWAY_RESIDENTIAL', 'color': colors.WHITE, 'lineweight': 20},
                'service': {'layer': 'HIGHWAY_SERVICE', 'color': colors.GRAY, 'lineweight': 10},
                'footway': {'layer': 'HIGHWAY_FOOTWAY', 'color': colors.MAGENTA, 'lineweight': 5},
                'cycleway': {'layer': 'HIGHWAY_CYCLEWAY', 'color': colors.BLUE, 'lineweight': 5},
                'path': {'layer': 'HIGHWAY_PATH', 'color': colors.GREEN, 'lineweight': 5},
            },
            'building': {
                'default': {'layer': 'BUILDING', 'color': colors.GRAY, 'lineweight': 25}
            },
            'waterway': {
                'river': {'layer': 'WATERWAY_RIVER', 'color': colors.BLUE, 'lineweight': 50},
                'stream': {'layer': 'WATERWAY_STREAM', 'color': colors.BLUE, 'lineweight': 20},
                'canal': {'layer': 'WATERWAY_CANAL', 'color': colors.BLUE, 'lineweight': 30},
                'drain': {'layer': 'WATERWAY_DRAIN', 'color': colors.CYAN, 'lineweight': 10},
            },
            'natural': {
                'water': {'layer': 'NATURAL_WATER', 'color': colors.BLUE, 'lineweight': 25},
                'coastline': {'layer': 'NATURAL_COASTLINE', 'color': colors.BLUE, 'lineweight': 50},
                'tree': {'layer': 'NATURAL_TREE', 'color': colors.GREEN, 'lineweight': 5},
                'forest': {'layer': 'NATURAL_FOREST', 'color': colors.GREEN, 'lineweight': 25},
            },
            'amenity': {
                'default': {'layer': 'AMENITY', 'color': colors.MAGENTA, 'lineweight': 15}
            },
            'landuse': {
                'default': {'layer': 'LANDUSE', 'color': colors.YELLOW, 'lineweight': 15}
            }
        }
    
        self.use_colors = use_colors
        
        # Apply plan type filtering
        if plan_type == 'key-plan':
            # Remove footpaths for simplified view
            if 'footway' in self.layer_config['highway']:
                del self.layer_config['highway']['footway']
            if 'path' in self.layer_config['highway']:
                del self.layer_config['highway']['path']
    
    def get_layer_info(self, tags: Dict[str, str]) -> Dict[str, any]:
        """Get layer information based on OSM tags."""
        for key, value in tags.items():
            if key in self.layer_config:
                category = self.layer_config[key]
                if value in category:
                    layer_info = category[value].copy()
                else:
                    layer_info = category.get('default', {
                        'layer': f'{key.upper()}_OTHER',
                        'color': colors.WHITE,
                        'lineweight': 10
                    }).copy()
                
                # Apply color settings based on plan type
                if not self.use_colors:
                    layer_info['color'] = colors.WHITE
                
                return layer_info
        
        # Default layer for unrecognized tags
        return {
            'layer': 'MISC',
            'color': colors.WHITE if not self.use_colors else colors.GRAY,
            'lineweight': 5
        }


class CoordinateTransformer:
    """Transforms coordinates from WGS84 to target CRS."""
    
    def __init__(self, target_crs: str = "EPSG:3857"):
        self.transformer = Transformer.from_crs("EPSG:4326", target_crs, always_xy=True)
    
    def transform(self, lon: float, lat: float) -> Tuple[float, float]:
        """Transform longitude, latitude to target CRS."""
        return self.transformer.transform(lon, lat)


class OSMHandler(osmium.SimpleHandler):
    """Handles OSM data parsing."""
    
    def __init__(self):
        super().__init__()
        self.nodes = {}
        self.ways = []
        self.relations = []
    
    def node(self, n):
        """Process OSM node."""
        tags = dict(n.tags) if n.tags else {}
        self.nodes[n.id] = OSMNode(n.id, n.location.lat, n.location.lon, tags)
    
    def way(self, w):
        """Process OSM way."""
        tags = dict(w.tags) if w.tags else {}
        nodes = [n.ref for n in w.nodes]
        self.ways.append(OSMWay(w.id, nodes, tags))
    
    def relation(self, r):
        """Process OSM relation."""
        tags = dict(r.tags) if r.tags else {}
        members = [(m.type, m.ref, m.role) for m in r.members]
        self.relations.append(OSMRelation(r.id, members, tags))


class DXFGenerator:
    """Generates DXF files from OSM data."""
    
    def __init__(self, target_crs: str = "EPSG:3857", use_colors: bool = True, plan_type: str = 'key-plan'):
        self.doc = ezdxf.new('R2010')
        self.msp = self.doc.modelspace()
        self.layer_mapper = LayerMapper(use_colors, plan_type)
        self.coord_transformer = CoordinateTransformer(target_crs)
        self.created_layers = set()
        self.plan_type = plan_type
    
    def create_layer(self, layer_name: str, color: int, lineweight: int):
        """Create a DXF layer with specified properties."""
        if layer_name not in self.created_layers:
            layer = self.doc.layers.new(layer_name)
            layer.color = color
            layer.lineweight = lineweight
            self.created_layers.add(layer_name)
    
    def process_nodes(self, nodes: Dict[int, OSMNode]):
        """Transform node coordinates and create point features for tagged nodes."""
        logging.info(f"Processing {len(nodes)} nodes...")
        
        for node in nodes.values():
            # Transform coordinates
            node.x, node.y = self.coord_transformer.transform(node.lon, node.lat)
            
            # Create point features for nodes with significant tags
            if node.tags and any(key in ['amenity', 'shop', 'tourism', 'highway'] for key in node.tags.keys()):
                layer_info = self.layer_mapper.get_layer_info(node.tags)
                self.create_layer(layer_info['layer'], layer_info['color'], layer_info['lineweight'])
                
                # Create a point or small circle for the node
                self.msp.add_circle(
                    center=(node.x, node.y),
                    radius=5.0,  # 5 meter radius
                    dxfattribs={'layer': layer_info['layer']}
                )
    
    def process_ways(self, ways: List[OSMWay], nodes: Dict[int, OSMNode]):
        """Convert OSM ways to DXF polylines."""
        logging.info(f"Processing {len(ways)} ways...")
        
        for way in ways:
            if not way.tags:
                continue
            
            # Skip footpaths for key-plan
            if self.plan_type == 'key-plan' and way.tags.get('highway') in ['footway', 'path']:
                continue
            
            # Get coordinates for way nodes
            coordinates = []
            for node_id in way.nodes:
                if node_id in nodes:
                    node = nodes[node_id]
                    coordinates.append((node.x, node.y))
            
            if len(coordinates) < 2:
                continue
            
            # Determine layer and styling
            layer_info = self.layer_mapper.get_layer_info(way.tags)
            self.create_layer(layer_info['layer'], layer_info['color'], layer_info['lineweight'])
            
            # Create polyline or polygon
            if way.tags.get('area') == 'yes' or 'building' in way.tags or 'landuse' in way.tags:
                # Create polygon (closed polyline)
                if coordinates[0] != coordinates[-1]:
                    coordinates.append(coordinates[0])  # Close the polygon
                
                polyline = self.msp.add_lwpolyline(
                    coordinates,
                    close=True,
                    dxfattribs={'layer': layer_info['layer']}
                )
            else:
                # Create polyline (open)
                polyline = self.msp.add_lwpolyline(
                    coordinates,
                    dxfattribs={'layer': layer_info['layer']}
                )
    
    def save(self, output_path: str):
        """Save the DXF document."""
        self.doc.saveas(output_path)
        logging.info(f"DXF file saved to: {output_path}")


def setup_logging(verbose: bool = False):
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )


def main():
    """Main conversion function."""
    parser = argparse.ArgumentParser(description='Convert OSM data to DXF format')
    parser.add_argument('input_file', help='Input OSM file path')
    parser.add_argument('-o', '--output', help='Output DXF file path')
    parser.add_argument('--projection', default='EPSG:3857', help='Target projection (default: EPSG:3857)')
    parser.add_argument('--plan-type', choices=['key-plan', 'location-plan'], default='key-plan',
                       help='Plan type: key-plan (simplified) or location-plan (detailed)')
    parser.add_argument('--no-colors', action='store_true', help='Disable colors (monochrome output)')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('--stats-output', help='Output file for conversion statistics (JSON)')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    
    # Validate input file
    input_path = Path(args.input_file)
    if not input_path.exists():
        logging.error(f"Input file not found: {input_path}")
        sys.exit(1)
    
    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.with_suffix('.dxf')
    
    try:
        logging.info(f"Starting OSM to DXF conversion...")
        logging.info(f"Input: {input_path}")
        logging.info(f"Output: {output_path}")
        logging.info(f"Plan type: {args.plan_type}")
        logging.info(f"Projection: {args.projection}")
        logging.info(f"Colors: {'disabled' if args.no_colors else 'enabled'}")
        
        # Parse OSM data
        logging.info("Parsing OSM data...")
        handler = OSMHandler()
        handler.apply_file(str(input_path))
        
        logging.info(f"Parsed {len(handler.nodes)} nodes, {len(handler.ways)} ways, {len(handler.relations)} relations")
        
        # Generate DXF
        logging.info("Generating DXF...")
        use_colors = not args.no_colors
        dxf_gen = DXFGenerator(args.projection, use_colors, args.plan_type)
        
        # Process data
        dxf_gen.process_nodes(handler.nodes)
        dxf_gen.process_ways(handler.ways, handler.nodes)
        
        # Save DXF file
        dxf_gen.save(str(output_path))
        
        # Generate statistics
        stats = {
            'nodes': len(handler.nodes),
            'ways': len(handler.ways),
            'relations': len(handler.relations),
            'layers': len(dxf_gen.created_layers),
            'file_size': output_path.stat().st_size,
            'plan_type': args.plan_type,
            'projection': args.projection,
            'colors_enabled': use_colors
        }
        
        # Output statistics
        if args.stats_output:
            with open(args.stats_output, 'w') as f:
                json.dump(stats, f, indent=2)
            logging.info(f"Statistics saved to: {args.stats_output}")
        
        logging.info("Conversion completed successfully!")
        logging.info(f"Created {stats['layers']} layers")
        logging.info(f"Output file size: {stats['file_size']} bytes")
        
    except Exception as e:
        logging.error(f"Conversion failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()