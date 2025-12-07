import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TablePagination,
  CircularProgress,
  Box,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { billingAPI } from '../services/api';
import { format } from 'date-fns';

const Billing = () => {
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useState({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchBilling();
  }, [page, rowsPerPage]);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const response = await billingAPI.getAll(page + 1, rowsPerPage);
      setBilling(response.data.data.billing);
      setTotal(response.data.data.pagination.total);
    } catch (error) {
      console.error('Error fetching billing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchParams.startDate && !searchParams.endDate) {
      fetchBilling();
      return;
    }

    setLoading(true);
    try {
      const response = await billingAPI.search(searchParams);
      setBilling(response.data.data);
      setTotal(response.data.count);
    } catch (error) {
      console.error('Error searching billing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      case 'REFUNDED':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && billing.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Billing Management
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Billing Records
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={searchParams.startDate}
              onChange={(e) =>
                setSearchParams({ ...searchParams, startDate: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={searchParams.endDate}
              onChange={(e) =>
                setSearchParams({ ...searchParams, endDate: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Search />}
              onClick={handleSearch}
              size="large"
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Billing ID</TableCell>
              <TableCell>User ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Booking ID</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell>Transaction Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billing.map((bill) => (
              <TableRow key={bill.billing_id}>
                <TableCell>{bill.billing_id}</TableCell>
                <TableCell>{bill.user_id}</TableCell>
                <TableCell>
                  <Chip label={bill.booking_type} size="small" />
                </TableCell>
                <TableCell>{bill.booking_id}</TableCell>
                <TableCell>${parseFloat(bill.total_amount).toFixed(2)}</TableCell>
                <TableCell>{bill.payment_method || 'N/A'}</TableCell>
                <TableCell>
                  {format(new Date(bill.transaction_date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={bill.transaction_status}
                    color={getStatusColor(bill.transaction_status)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
};

export default Billing;
