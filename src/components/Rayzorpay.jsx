// src/components/RazorPay.jsx
import React from "react";
import Cookies from "js-cookie";

// helper: load razorpay script dynamically
function loadRazorpayScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * RazorPay Component
 * Props:
 * - amount: number (required)
 * - onSuccess: function (called after successful payment)
 * - validateCashierId: function (should return boolean)
 */
const RazorPay = ({ amount, onSuccess, validateCashierId, onCancel }) => {

  const handlePayment = async () => {
    // âœ… Check cashier ID before proceeding
    if (validateCashierId && !validateCashierId()) {
      alert("Please enter a valid Cashier ID before proceeding.");
      return;
    }

    const res = await loadRazorpayScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      alert("âš ï¸ Razorpay SDK failed to load. Please check your connection.");
      return;
    }

    try {
      // Step 1ï¸âƒ£: Create order from backend
      const orderResponse = await fetch("https://smartinventorysystemsbyvinodmudavath.onrender.com/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("sr_token")}`,
        },
        body: JSON.stringify({ amount }), // send dynamic amount
      });

      const orderData = await orderResponse.json();
      if (!orderData?.orderId) {
        throw new Error("Invalid order response from server");
      }

      // Step 2ï¸âƒ£: Setup Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount.toString(),
        currency: orderData.currency,
        name: "Smart Inventory & POS Systems",
        description: "Simplify your business with Smart Inventory and POS solutions",
        image: "https://yourdomain.com/logo.png",
        order_id: orderData.orderId,

        handler: async function (response) {
          try {
            // Step 3ï¸âƒ£: Verify payment on backend
            const verifyData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

            const verifyRes = await fetch("https://smartinventorysystemsbyvinodmudavath.onrender.com/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Cookies.get("sr_token")}`,
              },
              body: JSON.stringify(verifyData),
            });

            const verifyResult = await verifyRes.json();

            if (verifyResult.status === "succuss" || verifyResult.status === "success") {
              alert("âœ… Payment successful and verified!");

              // Step 4ï¸âƒ£: Notify parent (SalePOS) that payment succeeded
              if (onSuccess) {
                await onSuccess(response);
              }
            } else {
              alert("âŒ Payment verification failed!");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("âŒ Error verifying payment.");
          }
        },

        prefill: {
          name: "Vinod Mudavath",
          email: "vinodmudavath30@gmail.com",
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new window.Razorpay(options);

      // âœ… Add cancel handler
      rzp.on("payment.failed", function (response) {
        alert("âŒ Payment was cancelled or failed.");
        console.error("Payment failed:", response.error);
      });

      rzp.open();
    } catch (err) {
      console.error("Payment initiation error:", err);
      alert("âŒ Payment initiation failed. Please try again.");
    }
  };

  return (
    <div style={{ padding: 20, display: "flex", gap: 10 }}>
      <button
        onClick={handlePayment}
        style={{
          background: "#3399cc",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        ðŸ’³ Pay with Razorpay
      </button>

      <button
        onClick={onCancel}
        style={{
          background: "#e74c3c",
          color: "#403939ff",
          border: "none",
          padding: "10px 20px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        âŒ Cancel
      </button>
    </div>
  );
};

export default RazorPay;
