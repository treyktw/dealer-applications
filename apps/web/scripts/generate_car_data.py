# generate_vehicles.py - Vehicle CSV Generator

import csv
import random
from faker import Faker

fake = Faker()

# Vehicle data for realistic generation
MAKES_MODELS = {
    "Honda": ["Civic", "Accord", "CR-V", "Pilot", "Fit", "HR-V", "Passport", "Ridgeline"],
    "Toyota": ["Camry", "Corolla", "RAV4", "Highlander", "Prius", "Tacoma", "4Runner", "Sienna"],
    "Ford": ["F-150", "Escape", "Explorer", "Mustang", "Focus", "Fusion", "Edge", "Expedition"],
    "Chevrolet": ["Silverado", "Equinox", "Malibu", "Traverse", "Tahoe", "Suburban", "Camaro", "Corvette"],
    "Nissan": ["Altima", "Sentra", "Rogue", "Murano", "Pathfinder", "Titan", "370Z", "GT-R"],
    "BMW": ["3 Series", "5 Series", "X3", "X5", "Z4", "i3", "i8", "M3"],
    "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "AMG GT", "G-Class"],
    "Audi": ["A3", "A4", "A6", "Q3", "Q5", "Q7", "TT", "R8"],
    "Volkswagen": ["Jetta", "Passat", "Tiguan", "Atlas", "Golf", "Beetle", "Arteon", "ID.4"],
    "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Veloster", "Genesis", "Ioniq"]
}

TRIMS = ["Base", "LX", "EX", "EX-L", "Sport", "Touring", "Limited", "Premium", "Luxury", "S", "SE", "SEL", "SL", "SR"]

COLORS = [
    "White", "Black", "Silver", "Gray", "Red", "Blue", "Green", "Brown", "Gold", "Beige",
    "Pearl White", "Metallic Silver", "Deep Blue", "Midnight Black", "Cherry Red", "Forest Green"
]

FUEL_TYPES = ["Gasoline", "Hybrid", "Electric", "Diesel", "Plug-in Hybrid"]

TRANSMISSIONS = ["Manual", "CVT", "6-Speed Automatic", "8-Speed Automatic", "9-Speed Automatic", "10-Speed Automatic"]

ENGINES = [
    "2.0L 4-Cylinder", "2.4L 4-Cylinder", "3.5L V6", "5.7L V8", "1.5L Turbo", "2.0L Turbo",
    "3.0L Twin-Turbo V6", "6.2L V8", "1.8L Hybrid", "Electric Motor", "2.7L EcoBoost"
]

STATUSES = ["AVAILABLE", "SOLD", "PENDING", "RESERVED"]

FEATURES_POOL = [
    "Backup Camera", "Bluetooth", "Apple CarPlay", "Android Auto", "Navigation System",
    "Sunroof", "Leather Seats", "Heated Seats", "Cooled Seats", "Remote Start",
    "Keyless Entry", "Power Windows", "Power Locks", "Cruise Control", "Adaptive Cruise Control",
    "Lane Departure Warning", "Blind Spot Monitoring", "Forward Collision Warning",
    "Automatic Emergency Braking", "Parking Sensors", "360-Degree Camera", "Wireless Charging",
    "Premium Audio", "Dual Zone Climate", "Third Row Seating", "All-Wheel Drive"
]

def generate_vin():
    """Generate a realistic-looking VIN"""
    # Simplified VIN generation for demo purposes
    chars = "ABCDEFGHJKLMNPRSTUVWXYZ1234567890"
    return ''.join(random.choices(chars, k=17))

def generate_stock_number():
    """Generate a stock number"""
    return f"{random.choice(['A', 'B', 'C', 'D'])}{random.randint(1000, 9999)}"

def generate_vehicle_entry():
    """Generate a single vehicle entry"""
    # Select make and model
    make = random.choice(list(MAKES_MODELS.keys()))
    model = random.choice(MAKES_MODELS[make])
    year = random.randint(2015, 2024)
    
    # Generate basic info
    stock = generate_stock_number()
    vin = generate_vin()
    trim = random.choice(TRIMS) if random.choice([True, False]) else ""
    
    # Generate mileage based on year
    current_year = 2024
    age = current_year - year
    base_mileage = age * random.randint(8000, 15000)
    mileage = max(0, base_mileage + random.randint(-5000, 10000))
    
    # Generate price based on year and make
    base_prices = {
        "Honda": 25000, "Toyota": 26000, "Ford": 24000, "Chevrolet": 23000,
        "Nissan": 22000, "BMW": 45000, "Mercedes-Benz": 50000, "Audi": 42000,
        "Volkswagen": 28000, "Hyundai": 21000
    }
    
    base_price = base_prices.get(make, 25000)
    # Depreciation factor based on age
    depreciation = 0.85 ** age
    price = int(base_price * depreciation * random.uniform(0.9, 1.1))
    
    # Colors and specs
    exterior_color = random.choice(COLORS)
    interior_color = random.choice(["Black", "Gray", "Beige", "Brown", "Tan"])
    fuel_type = random.choice(FUEL_TYPES)
    transmission = random.choice(TRANSMISSIONS)
    engine = random.choice(ENGINES)
    
    # Description
    condition_words = ["excellent", "great", "good", "well-maintained", "pristine", "clean"]
    descriptions = [
        f"This {year} {make} {model} is in {random.choice(condition_words)} condition.",
        f"Well-maintained {make} {model} with low mileage.",
        f"Great value {year} {make} {model} with many features.",
        f"Clean {make} {model} perfect for daily driving.",
        f"Reliable {year} {make} {model} with excellent history."
    ]
    description = random.choice(descriptions)
    
    # Status and featured
    status = random.choice(STATUSES)
    # Make some vehicles featured (about 20%)
    featured = "true" if random.random() < 0.2 else "false"
    
    # Features (select 3-8 random features)
    num_features = random.randint(3, 8)
    selected_features = random.sample(FEATURES_POOL, num_features)
    features = "\n".join(selected_features)
    
    return [
        stock,           # Stock Number
        vin,             # VIN
        make,            # Make
        model,           # Model
        year,            # Year
        trim,            # Trim
        mileage,         # Mileage
        price,           # Price
        exterior_color,  # Exterior Color
        interior_color,  # Interior Color
        fuel_type,       # Fuel Type
        transmission,    # Transmission
        engine,          # Engine
        description,     # Description
        status,          # Status
        featured,        # Featured
        features         # Features
    ]

def generate_vehicles_csv(filename="vehicles_import.csv", count=30):
    """Generate a CSV file with vehicle data"""
    headers = [
        "Stock Number",
        "VIN",
        "Make",
        "Model",
        "Year",
        "Trim",
        "Mileage",
        "Price",
        "Exterior Color",
        "Interior Color",
        "Fuel Type",
        "Transmission",
        "Engine",
        "Description",
        "Status",
        "Featured",
        "Features"
    ]
    
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        for _ in range(count):
            writer.writerow(generate_vehicle_entry())
    
    print(f"{count} vehicle entries written to {filename}")
    print(f"Headers: {', '.join(headers)}")

def create_test_file():
    """Create a minimal test file for debugging"""
    test_data = [
        [
            "Stock Number", "VIN", "Make", "Model", "Year", "Trim", "Mileage", "Price",
            "Exterior Color", "Interior Color", "Fuel Type", "Transmission", "Engine",
            "Description", "Status", "Featured", "Features"
        ],
        [
            "A1234", "1HGBH41JXMN109186", "Honda", "Civic", "2022", "EX", "25000", "22500",
            "Silver", "Black", "Gasoline", "CVT", "2.0L 4-Cylinder",
            "Well-maintained Honda Civic in excellent condition", "AVAILABLE", "false",
            "Backup Camera\nBluetooth\nApple CarPlay"
        ],
        [
            "B5678", "JM1BK32F981234567", "Toyota", "Camry", "2021", "LE", "35000", "24500",
            "White", "Gray", "Gasoline", "8-Speed Automatic", "2.5L 4-Cylinder",
            "Reliable Toyota Camry perfect for daily driving", "AVAILABLE", "true",
            "Navigation System\nHeated Seats\nBlind Spot Monitoring"
        ],
        [
            "C9012", "WBAFB9C50BC123456", "BMW", "3 Series", "2020", "330i", "45000", "32000",
            "Black", "Black", "Gasoline", "8-Speed Automatic", "2.0L Turbo",
            "Luxury BMW 3 Series with premium features", "PENDING", "false",
            "Leather Seats\nSunroof\nNavigation System\nPremium Audio"
        ]
    ]
    
    with open("vehicles_test.csv", mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        for row in test_data:
            writer.writerow(row)
    
    print("Test file created: vehicles_test.csv")

# Generate sample data
if __name__ == "__main__":
    generate_vehicles_csv("vehicles_import.csv", count=25)
    create_test_file()
    print("\nFiles created:")
    print("- vehicles_import.csv (25 vehicles)")
    print("- vehicles_test.csv (3 test vehicles)")
    print("\nUse vehicles_test.csv first to test the import functionality!")