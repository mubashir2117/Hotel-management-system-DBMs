-- ============================================================
-- Hotel Portal Database Setup Script
-- Run this ONCE in SQL Server Management Studio
-- ============================================================

USE master;
GO

-- Drop database if you want a fresh setup
-- ALTER DATABASE HotelPortalDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
-- DROP DATABASE IF EXISTS HotelPortalDB;
-- GO

-- Create Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HotelPortalDB')
    CREATE DATABASE HotelPortalDB;
GO

USE HotelPortalDB;
GO

-- =============================================
-- 1. TABLE CREATION (Schema Definition)
-- =============================================

-- USERS Table
IF OBJECT_ID('Users', 'U') IS NULL
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,              -- For secure hashed passwords
    Password VARCHAR(255) NULL,                      -- For storing plain text password (as requested)
    Role VARCHAR(10) NOT NULL CHECK (Role IN ('admin','guest')),
    Phone VARCHAR(30),
    Country NVARCHAR(80),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- GUESTS Table
IF OBJECT_ID('Guests', 'U') IS NULL
CREATE TABLE Guests (
    GuestId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL REFERENCES Users(UserId) ON DELETE CASCADE,
    LoyaltyPoints INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ROOMS Table
IF OBJECT_ID('Rooms', 'U') IS NULL
CREATE TABLE Rooms (
    RoomId INT IDENTITY(1,1) PRIMARY KEY,
    RoomNumber VARCHAR(10) NOT NULL UNIQUE,
    RoomType VARCHAR(20) NOT NULL CHECK (RoomType IN ('Single','Double','Suite','Deluxe')),
    Floor INT NOT NULL,
    Capacity INT NOT NULL DEFAULT 2,
    BasePricePerNight DECIMAL(10,2) NOT NULL,
    Description NVARCHAR(500),
    Amenities VARCHAR(200),
    Status VARCHAR(20) NOT NULL DEFAULT 'Available' 
        CHECK (Status IN ('Available','Occupied','Under Maintenance','Reserved')),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- BOOKINGS Table
IF OBJECT_ID('Bookings', 'U') IS NULL
CREATE TABLE Bookings (
    BookingId INT IDENTITY(1,1) PRIMARY KEY,
    GuestId INT NOT NULL REFERENCES Guests(GuestId),
    RoomId INT NOT NULL REFERENCES Rooms(RoomId),
    CheckInDate DATE NOT NULL,
    CheckOutDate DATE NOT NULL,
    Nights INT NOT NULL,
    TotalPrice DECIMAL(10,2) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (Status IN ('Pending','Confirmed','Checked-In','Checked-Out','Cancelled')),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- SEASONAL PRICING Table
IF OBJECT_ID('SeasonalPricing', 'U') IS NULL
CREATE TABLE SeasonalPricing (
    PricingId INT IDENTITY(1,1) PRIMARY KEY,
    SeasonName VARCHAR(100) NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    RoomType VARCHAR(20) NULL,
    PriceMultiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- SERVICE MENU ITEMS Table
IF OBJECT_ID('ServiceMenuItems', 'U') IS NULL
CREATE TABLE ServiceMenuItems (
    ItemId INT IDENTITY(1,1) PRIMARY KEY,
    ItemName NVARCHAR(100) NOT NULL,
    Category VARCHAR(20) NOT NULL CHECK (Category IN ('Food','Beverage','Housekeeping','Laundry','Maintenance')),
    Price DECIMAL(10,2) NOT NULL,
    IsAvailable BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- SERVICE REQUESTS Table
IF OBJECT_ID('ServiceRequests', 'U') IS NULL
CREATE TABLE ServiceRequests (
    RequestId INT IDENTITY(1,1) PRIMARY KEY,
    BookingId INT NOT NULL REFERENCES Bookings(BookingId),
    GuestId INT NOT NULL REFERENCES Guests(GuestId),
    ItemId INT NOT NULL REFERENCES ServiceMenuItems(ItemId),
    Quantity INT NOT NULL DEFAULT 1,
    Notes NVARCHAR(300),
    Status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (Status IN ('Pending','In Progress','Completed')),
    RequestedAt DATETIME DEFAULT GETDATE()
);
GO

-- CONTACT MESSAGES Table
IF OBJECT_ID('ContactMessages', 'U') IS NULL
CREATE TABLE ContactMessages (
    MessageId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NULL REFERENCES Users(UserId) ON DELETE SET NULL, 
    GuestName NVARCHAR(100) NOT NULL,                           
    GuestEmail VARCHAR(150) NOT NULL,                           
    Subject NVARCHAR(200) NOT NULL,                             
    Message NVARCHAR(MAX) NOT NULL,                             
    Status VARCHAR(20) NOT NULL DEFAULT 'Unread' 
        CHECK (Status IN ('Unread', 'Read', 'Replied')),        
    SubmittedAt DATETIME DEFAULT GETDATE()                      
);
GO


-- =============================================
-- 2. SEED DATA (Insert Default Records)
-- =============================================

-- Seed System Users (Admin & Guests)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@hotel.com')
    INSERT INTO Users (Name, Email, PasswordHash, Password, Role, Phone, Country)
    VALUES ('Admin User', 'admin@hotel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin123', 'admin', '+1-800-000-0001', 'USA');

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'guest@hotel.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Password, Role, Phone, Country)
    VALUES ('John Smith', 'guest@hotel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guest123', 'guest', '+1-555-123-4567', 'USA');
    INSERT INTO Guests (UserId, LoyaltyPoints) VALUES (SCOPE_IDENTITY(), 120);
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'mubashir@hotel.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Password, Role, Phone, Country)
    VALUES ('Mubashir Khan', 'mubashir@hotel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'mjmubashir', 'guest', '03112988764', 'Pakistan');
    INSERT INTO Guests (UserId, LoyaltyPoints) VALUES (SCOPE_IDENTITY(), 80);
END
GO

-- Seed Rooms Data
IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomNumber = '101')
INSERT INTO Rooms (RoomNumber, RoomType, Floor, Capacity, BasePricePerNight, Description, Amenities, Status) 
VALUES
('101','Single',1,1,89.00,'Cozy single room with city view','WiFi,AC,TV','Available'),
('102','Single',1,1,89.00,'Standard single room','WiFi,AC,TV','Available'),
('201','Double',2,2,149.00,'Spacious double room','WiFi,AC,TV,Minibar','Available'),
('202','Double',2,2,149.00,'Double room with balcony','WiFi,AC,TV,Minibar,Balcony','Available'),
('301','Suite',3,3,299.00,'Luxury suite','WiFi,AC,TV,Minibar,Jacuzzi','Available'),
('401','Deluxe',4,4,449.00,'Presidential Deluxe suite','WiFi,AC,TV,Minibar,Jacuzzi','Available');
GO

-- Seed Seasonal Pricing
IF NOT EXISTS (SELECT 1 FROM SeasonalPricing WHERE SeasonName = 'Peak Summer')
INSERT INTO SeasonalPricing (SeasonName, StartDate, EndDate, RoomType, PriceMultiplier) VALUES
('Peak Summer','2026-06-01','2026-08-31',NULL,1.50),
('Holiday Season','2026-12-20','2027-01-05',NULL,1.75);
GO

-- Seed Service Menu Items
IF NOT EXISTS (SELECT 1 FROM ServiceMenuItems WHERE ItemName = 'Club Sandwich')
INSERT INTO ServiceMenuItems (ItemName, Category, Price, IsAvailable) VALUES
('Club Sandwich','Food',14.00,1),
('Cheese Burger','Food',16.00,1),
('Caesar Salad','Food',12.00,1),
('Grilled Salmon','Food',28.00,1),
('Room Cleaning','Housekeeping',0.00,1),
('Laundry Service','Laundry',15.00,1);
GO

-- Seed Contact Messages
IF NOT EXISTS (SELECT 1 FROM ContactMessages WHERE GuestEmail = 'john.doe@example.com')
BEGIN
    INSERT INTO ContactMessages (UserId, GuestName, GuestEmail, Subject, Message, Status)
    VALUES (
        (SELECT TOP 1 UserId FROM Users WHERE Email = 'guest@hotel.com'), 
        'John Doe', 
        'john.doe@example.com', 
        'Booking Inquiry', 
        'How can we help you? I wanted to know if late check-out is available for standard rooms.', 
        'Unread'
    );
END
GO


-- =============================================
-- 3. VALIDATION & LOGS
-- =============================================
PRINT '==================================================';
PRINT '✅ HotelPortalDB Unified Setup Completed Successfully!';
PRINT 'Admin Login   : admin@hotel.com / admin123';
PRINT 'Guest Login   : guest@hotel.com / guest123';
PRINT 'Mubashir Login: mubashir@hotel.com / mjmubashir';
PRINT '==================================================';

-- Final System Check
SELECT UserId, Name, Email, PasswordHash, Password, Role, Phone FROM Users;
SELECT * FROM ContactMessages;
SELECT COUNT(*) AS Total_Rooms FROM Rooms;
GO