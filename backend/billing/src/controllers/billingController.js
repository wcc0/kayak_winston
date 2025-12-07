const billingService = require('../services/billingService');
const paymentService = require('../services/paymentService');
const invoiceService = require('../services/invoiceService');

class BillingController {
  // Create billing
  async createBilling(req, res) {
    try {
      const billing = await billingService.createBilling(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Billing created successfully',
        data: billing
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating billing',
        error: error.message
      });
    }
  }
  
  // Get billing by ID
  async getBillingById(req, res) {
    try {
      const { billing_id } = req.params;
      const billing = await billingService.getBillingById(billing_id);
      
      res.status(200).json({
        success: true,
        data: billing
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Billing not found',
        error: error.message
      });
    }
  }
  
  // Get user billings
  async getUserBillings(req, res) {
    try {
      const { user_id } = req.params;
      const billings = await billingService.getUserBillings(user_id);
      
      res.status(200).json({
        success: true,
        count: billings.length,
        data: billings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user billings',
        error: error.message
      });
    }
  }
  
  // Search billings (Admin)
  async searchBillings(req, res) {
    try {
      const filters = req.query;
      const billings = await billingService.searchBillings(filters);
      
      res.status(200).json({
        success: true,
        count: billings.length,
        data: billings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error searching billings',
        error: error.message
      });
    }
  }
  // Update Billing
async updateBilling(req, res) {
  try {
    const { billing_id } = req.params;
    const updatedBilling = await billingService.updateBilling(billing_id, req.body);

    res.status(200).json({
      success: true,
      message: "Billing updated successfully",
      data: updatedBilling
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating billing",
      error: error.message
    });
  }
}

// Delete Billing
async deleteBilling(req, res) {
  try {
    const { billing_id } = req.params;
    await billingService.deleteBilling(billing_id);

    res.status(200).json({
      success: true,
      message: "Billing deleted successfully"
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "Error deleting billing",
      error: error.message
    });
  }
}

  // Process payment
  async processPayment(req, res) {
    try {
      const { billing_id, payment_details } = req.body;
      
      // Validate card details
      const validation = paymentService.validateCardDetails(payment_details.card_details);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }
      
      // Process payment
      const paymentResult = await paymentService.processPayment({
        amount: payment_details.amount,
        payment_method: payment_details.payment_method,
        card_details: payment_details.card_details
      });
      
      if (paymentResult.success) {
        // Update billing status
        await billingService.updateBillingStatus(
          billing_id,
          'completed',
          paymentResult.payment_reference
        );
        
        res.status(200).json({
          success: true,
          message: 'Payment processed successfully',
          data: paymentResult
        });
      } else {
        // Update billing status to failed
        await billingService.updateBillingStatus(billing_id, 'failed');
        
        res.status(400).json({
          success: false,
          message: paymentResult.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Payment processing failed',
        error: error.message
      });
    }
  }
  
  // Get billing statistics (Admin)
  async getBillingStats(req, res) {
    try {
      const filters = req.query;
      const stats = await billingService.getBillingStats(filters);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching billing statistics',
        error: error.message
      });
    }
  }
  
  // Get invoice
  async getInvoice(req, res) {
    try {
      const { billing_id } = req.params;
      const invoice = await invoiceService.getInvoiceByBillingId(billing_id);
      
      res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found',
        error: error.message
      });
    }
  }
  
  // Create invoice
  async createInvoice(req, res) {
    try {
      const { billing_id } = req.params;
      const invoice = await invoiceService.createInvoice(billing_id, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating invoice',
        error: error.message
      });
    }
  }
}

module.exports = new BillingController();