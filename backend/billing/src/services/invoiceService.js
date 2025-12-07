const Invoice = require('../models/Invoice');
const Billing = require('../models/Billing');

class InvoiceService {
  // Generate invoice number
  generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }
  
  // Create invoice
  async createInvoice(billing_id, invoiceData) {
    try {
      const billing = await Billing.findByPk(billing_id);
      
      if (!billing) {
        throw new Error('Billing not found');
      }
      
      const invoice = new Invoice({
        billing_id,
        invoice_number: this.generateInvoiceNumber(),
        user_details: invoiceData.user_details,
        booking_details: invoiceData.booking_details,
        line_items: invoiceData.line_items || [],
        subtotal: invoiceData.subtotal || billing.total_amount,
        tax: invoiceData.tax || 0,
        discount: invoiceData.discount || 0,
        total_amount: billing.total_amount,
        payment_details: {
          method: billing.payment_method,
          transaction_id: billing.payment_reference
        }
      });
      
      await invoice.save();
      
      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }
  
  // Get invoice by billing ID
  async getInvoiceByBillingId(billing_id) {
    try {
      const invoice = await Invoice.findOne({ billing_id });
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      return invoice;
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }
  
  // Get invoice by invoice number
  async getInvoiceByNumber(invoice_number) {
    try {
      const invoice = await Invoice.findOne({ invoice_number });
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      return invoice;
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }
}

module.exports = new InvoiceService();