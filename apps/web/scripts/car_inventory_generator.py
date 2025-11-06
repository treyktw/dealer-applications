"""
Realistic Car Inventory Generator
Generates accurate car data for luxury and performance makes including:
BMW, Audi, Mercedes-Benz, Lamborghini, Nissan GTR, Porsche, Ferrari, McLaren, etc.
"""

import random
import json
from datetime import datetime

class CarInventoryGenerator:
    def __init__(self):
        self.makes_data = {
            "BMW": {
                "models": {
                    "M3": {
                        "years": [2022, 2023, 2024, 2025],
                        "trims": ["Base", "Competition"],
                        "hp_range": (473, 503),
                        "transmission": ["6-Speed Manual", "8-Speed Automatic"],
                        "body_type": "Sedan",
                        "price_range": (72000, 85000)
                    },
                    "M4": {
                        "years": [2022, 2023, 2024, 2025],
                        "trims": ["Base", "Competition", "CSL"],
                        "hp_range": (473, 543),
                        "transmission": ["6-Speed Manual", "8-Speed Automatic"],
                        "body_type": "Coupe",
                        "price_range": (74000, 142000)
                    },
                    "M5": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "Competition"],
                        "hp_range": (600, 617),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "Sedan",
                        "price_range": (105000, 115000)
                    },
                    "X5 M": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "Competition"],
                        "hp_range": (600, 617),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "SUV",
                        "price_range": (107000, 117000)
                    },
                    "M8": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Gran Coupe", "Competition"],
                        "hp_range": (600, 617),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "Coupe",
                        "price_range": (133000, 146000)
                    }
                }
            },
            "Mercedes-AMG": {
                "models": {
                    "C63 S": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "S"],
                        "hp_range": (469, 503),
                        "transmission": ["9-Speed Automatic"],
                        "body_type": "Sedan",
                        "price_range": (75000, 85000)
                    },
                    "E63 S": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "S"],
                        "hp_range": (603, 603),
                        "transmission": ["9-Speed Automatic"],
                        "body_type": "Sedan",
                        "price_range": (108000, 115000)
                    },
                    "GT": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "S", "R", "Black Series"],
                        "hp_range": (523, 720),
                        "transmission": ["7-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (99000, 325000)
                    },
                    "G63": {
                        "years": [2022, 2023, 2024, 2025],
                        "trims": ["Base"],
                        "hp_range": (577, 577),
                        "transmission": ["9-Speed Automatic"],
                        "body_type": "SUV",
                        "price_range": (156000, 175000)
                    }
                }
            },
            "Audi": {
                "models": {
                    "RS3": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base"],
                        "hp_range": (401, 401),
                        "transmission": ["7-Speed DCT"],
                        "body_type": "Sedan",
                        "price_range": (60000, 65000)
                    },
                    "RS5": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Sportback"],
                        "hp_range": (444, 444),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "Coupe",
                        "price_range": (76000, 82000)
                    },
                    "RS6 Avant": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base"],
                        "hp_range": (591, 591),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "Wagon",
                        "price_range": (116000, 125000)
                    },
                    "RS7": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base"],
                        "hp_range": (591, 591),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "Sedan",
                        "price_range": (117000, 125000)
                    },
                    "R8": {
                        "years": [2022, 2023, 2024],
                        "trims": ["V10", "V10 Performance"],
                        "hp_range": (562, 602),
                        "transmission": ["7-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (158000, 210000)
                    }
                }
            },
            "Nissan": {
                "models": {
                    "GT-R": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Premium", "Track Edition", "NISMO"],
                        "hp_range": (565, 600),
                        "transmission": ["6-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (115000, 215000)
                    }
                }
            },
            "Lamborghini": {
                "models": {
                    "Huracan": {
                        "years": [2022, 2023, 2024],
                        "trims": ["EVO", "EVO RWD", "Tecnica", "STO"],
                        "hp_range": (602, 640),
                        "transmission": ["7-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (220000, 330000)
                    },
                    "Urus": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "S", "Performante"],
                        "hp_range": (641, 666),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "SUV",
                        "price_range": (230000, 260000)
                    },
                    "Aventador": {
                        "years": [2022],
                        "trims": ["LP 780-4 Ultimae"],
                        "hp_range": (769, 769),
                        "transmission": ["7-Speed ISR"],
                        "body_type": "Coupe",
                        "price_range": (500000, 550000)
                    },
                    "Revuelto": {
                        "years": [2024, 2025],
                        "trims": ["Base"],
                        "hp_range": (1001, 1001),
                        "transmission": ["8-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (600000, 650000)
                    }
                }
            },
            "Porsche": {
                "models": {
                    "911 Carrera": {
                        "years": [2022, 2023, 2024, 2025],
                        "trims": ["Base", "S", "GTS", "Turbo", "Turbo S"],
                        "hp_range": (379, 640),
                        "transmission": ["7-Speed Manual", "8-Speed PDK"],
                        "body_type": "Coupe",
                        "price_range": (107000, 230000)
                    },
                    "911 GT3": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "Touring", "RS"],
                        "hp_range": (502, 518),
                        "transmission": ["6-Speed Manual", "7-Speed PDK"],
                        "body_type": "Coupe",
                        "price_range": (162000, 225000)
                    },
                    "Taycan": {
                        "years": [2022, 2023, 2024, 2025],
                        "trims": ["Base", "4S", "GTS", "Turbo", "Turbo S"],
                        "hp_range": (402, 938),
                        "transmission": ["2-Speed Automatic"],
                        "body_type": "Sedan",
                        "price_range": (90000, 185000)
                    },
                    "Cayenne": {
                        "years": [2022, 2023, 2024, 2025],
                        "trims": ["Base", "S", "GTS", "Turbo GT"],
                        "hp_range": (348, 631),
                        "transmission": ["8-Speed Automatic"],
                        "body_type": "SUV",
                        "price_range": (72000, 180000)
                    }
                }
            },
            "Ferrari": {
                "models": {
                    "F8 Tributo": {
                        "years": [2022, 2023],
                        "trims": ["Base", "Spider"],
                        "hp_range": (710, 710),
                        "transmission": ["7-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (280000, 320000)
                    },
                    "SF90 Stradale": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base", "Spider"],
                        "hp_range": (986, 986),
                        "transmission": ["8-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (507000, 570000)
                    },
                    "Roma": {
                        "years": [2022, 2023, 2024],
                        "trims": ["Base"],
                        "hp_range": (612, 612),
                        "transmission": ["8-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (243000, 260000)
                    },
                    "296 GTB": {
                        "years": [2023, 2024, 2025],
                        "trims": ["Base"],
                        "hp_range": (818, 818),
                        "transmission": ["8-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (320000, 350000)
                    }
                }
            },
            "McLaren": {
                "models": {
                    "720S": {
                        "years": [2022, 2023],
                        "trims": ["Base", "Spider"],
                        "hp_range": (710, 710),
                        "transmission": ["7-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (310000, 345000)
                    },
                    "Artura": {
                        "years": [2023, 2024, 2025],
                        "trims": ["Base"],
                        "hp_range": (671, 671),
                        "transmission": ["8-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (237000, 260000)
                    },
                    "765LT": {
                        "years": [2022, 2023],
                        "trims": ["Base", "Spider"],
                        "hp_range": (755, 755),
                        "transmission": ["7-Speed DCT"],
                        "body_type": "Coupe",
                        "price_range": (382000, 420000)
                    }
                }
            }
        }
        
        self.exterior_colors = [
            "Alpine White", "Black Sapphire", "Portimao Blue", "Brooklyn Grey",
            "Tanzanite Blue", "Isle of Man Green", "Frozen Marina Bay Blue",
            "Obsidian Black", "Polar White", "Iridium Silver", "Selenite Grey",
            "Spectral Blue", "Patagonia Red", "Jupiter Red", "Rosso Corsa",
            "Giallo Modena", "Nero Daytona", "Bianco Avus", "Verde Mantis",
            "Arancio Borealis", "Rosso Mars", "Blu Uranus", "Grigio Telesto",
            "Racing Yellow", "Guards Red", "Miami Blue", "Chalk", "Carmine Red",
            "Jet Black Metallic", "Designo Diamond White", "Obsidian Black Metallic",
            "GT Silver Metallic", "Nardo Grey", "Suzuka Grey", "Championship White"
        ]
        
        self.interior_colors = [
            "Black", "Black/Red", "Cognac", "Saddle Brown", "Merino Beige",
            "Silverstone", "Black/Blue", "Mugello Red", "Extended Black",
            "Tartufo", "Black/Yellow Contrast", "Red/Black", "White/Black"
        ]
        
        self.options = [
            "Carbon Fiber Package", "Executive Package", "Sport Exhaust System",
            "M Driver's Package", "Premium Package", "Technology Package",
            "Adaptive M Suspension", "Carbon Ceramic Brakes", "Head-Up Display",
            "Harman Kardon Audio", "Burmester Audio", "Bang & Olufsen Audio",
            "Panoramic Sunroof", "Heated/Ventilated Seats", "Massage Seats",
            "Night Vision", "360° Camera System", "Parking Assist Plus",
            "Alcantara Headliner", "Carbon Fiber Interior Trim", "Full Leather Interior",
            "Sport Chrono Package", "PCCB (Carbon Ceramic Brakes)", "Lift System",
            "Lightweight Sports Package", "Aero Package", "Track Package"
        ]

    def generate_vin(self):
        """Generate a realistic VIN number"""
        chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
        return ''.join(random.choice(chars) for _ in range(17))

    def generate_stock_number(self):
        """Generate a stock number"""
        return f"ST{random.randint(10000, 99999)}"

    def generate_mileage(self, year):
        """Generate realistic mileage based on year"""
        current_year = 2025
        age = current_year - year
        
        if age == 0:
            return random.randint(5, 500)  # New/demo
        elif age == 1:
            return random.randint(1000, 15000)
        elif age == 2:
            return random.randint(8000, 30000)
        else:
            return random.randint(15000, 50000)

    def generate_car(self):
        """Generate a single realistic car"""
        make = random.choice(list(self.makes_data.keys()))
        make_data = self.makes_data[make]
        model = random.choice(list(make_data["models"].keys()))
        model_data = make_data["models"][model]
        
        year = random.choice(model_data["years"])
        trim = random.choice(model_data["trims"])
        hp = random.randint(model_data["hp_range"][0], model_data["hp_range"][1])
        transmission = random.choice(model_data["transmission"])
        body_type = model_data["body_type"]
        base_price = random.randint(model_data["price_range"][0], model_data["price_range"][1])
        
        # Determine transmission type for display
        if "DCT" in transmission:
            trans_type = "DCT"
        elif "Manual" in transmission:
            trans_type = "Manual"
        else:
            trans_type = "Automatic"
        
        # Add random options (3-8 options)
        num_options = random.randint(3, 8)
        selected_options = random.sample(self.options, num_options)
        options_cost = len(selected_options) * random.randint(1000, 5000)
        
        mileage = self.generate_mileage(year)
        
        # Adjust price based on mileage and options
        if mileage < 100:
            condition = "New"
            price = base_price + options_cost
        elif mileage < 1000:
            condition = "Demo"
            price = int((base_price + options_cost) * 0.95)
        else:
            condition = "Used"
            depreciation = 1 - (mileage / 100000 * 0.3)
            price = int((base_price + options_cost) * depreciation)
        
        car = {
            "stock_number": self.generate_stock_number(),
            "vin": self.generate_vin(),
            "condition": condition,
            "year": year,
            "make": make,
            "model": model,
            "trim": trim,
            "body_type": body_type,
            "exterior_color": random.choice(self.exterior_colors),
            "interior_color": random.choice(self.interior_colors),
            "mileage": mileage,
            "horsepower": hp,
            "transmission": transmission,
            "transmission_type": trans_type,
            "drivetrain": "AWD" if make in ["Audi", "Lamborghini", "Nissan"] or "X5" in model or "Cayenne" in model or "Urus" in model else random.choice(["RWD", "AWD"]),
            "fuel_type": "Electric" if "Taycan" in model else "Premium Gasoline",
            "options": selected_options,
            "price": price,
            "date_added": datetime.now().strftime("%Y-%m-%d")
        }
        
        return car

    def generate_inventory(self, count=50):
        """Generate multiple cars"""
        inventory = []
        for _ in range(count):
            inventory.append(self.generate_car())
        return inventory

    def save_to_json(self, inventory, filename="car_inventory.json"):
        """Save inventory to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(inventory, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {len(inventory)} cars to {filename}")

    def save_to_csv(self, inventory, filename="car_inventory.csv"):
        """Save inventory to CSV file"""
        import csv
        
        if not inventory:
            return
        
        keys = inventory[0].keys()
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            for car in inventory:
                # Convert list to string for CSV
                car_copy = car.copy()
                car_copy['options'] = '; '.join(car['options'])
                writer.writerow(car_copy)
        print(f"✓ Saved {len(inventory)} cars to {filename}")

    def print_sample(self, inventory, count=3):
        """Print sample cars"""
        print(f"\n{'='*80}")
        print(f"SAMPLE INVENTORY ({count} cars)")
        print(f"{'='*80}\n")
        
        for i, car in enumerate(inventory[:count], 1):
            print(f"Car #{i}")
            print(f"Stock #: {car['stock_number']} | VIN: {car['vin']}")
            print(f"{car['year']} {car['make']} {car['model']} {car['trim']}")
            print(f"Body: {car['body_type']} | Condition: {car['condition']}")
            print(f"Color: {car['exterior_color']} / {car['interior_color']}")
            print(f"Mileage: {car['mileage']:,} miles")
            print(f"Power: {car['horsepower']} HP")
            print(f"Transmission: {car['transmission']} ({car['transmission_type']})")
            print(f"Drivetrain: {car['drivetrain']}")
            print(f"Options: {', '.join(car['options'][:3])}...")
            print(f"Price: ${car['price']:,}")
            print(f"{'-'*80}\n")


def main():
    """Main function to run the generator"""
    print("=" * 80)
    print("LUXURY CAR INVENTORY GENERATOR")
    print("=" * 80)
    
    generator = CarInventoryGenerator()
    
    # Generate inventory
    print("\nGenerating inventory...")
    inventory_size = 1000  # Change this number to generate more or fewer cars
    inventory = generator.generate_inventory(inventory_size)
    
    # Display sample
    generator.print_sample(inventory, count=5)
    
    # Save to files
    print("Saving inventory to files...")
    generator.save_to_json(inventory, "car_inventory.json")
    generator.save_to_csv(inventory, "car_inventory.csv")
    
    print(f"\n✓ Successfully generated {len(inventory)} cars!")
    print("✓ Files created: car_inventory.json, car_inventory.csv")
    print("\nInventory Statistics:")
    makes = {}
    for car in inventory:
        makes[car['make']] = makes.get(car['make'], 0) + 1
    
    for make, count in sorted(makes.items()):
        print(f"  {make}: {count} cars")


if __name__ == "__main__":
    main()