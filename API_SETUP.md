# Setting up Twelve Data API (Reliable Stock Prices)

To fix the "API not working" issue permanently, we are switching to **Twelve Data**. It's free and much more reliable.

## Step 1: Get your FREE API Key
1.  Go to [twelvedata.com](https://twelvedata.com/).
2.  Click **"Get API Key"** (or Sign Up).
3.  Enter your email and name.
4.  Copy your **API Key** from the dashboard.

## Step 2: Add Key to Project
1.  Open the file `.env` in your project root (create it if it doesn't exist).
2.  Add this line:
    ```env
    VITE_TWELVE_DATA_API_KEY=your_api_key_here
    ```
    *(Replace `your_api_key_here` with the key you copied)*

3.  **Restart your development server** (stop it and run `npm run dev` again) for the changes to take effect.

## Step 3: Verify
1.  Go back to your Portfolio page.
2.  You should now see "Live Market Data Active" and correct prices.
