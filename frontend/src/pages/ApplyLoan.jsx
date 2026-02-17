import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Stepper, Step, StepLabel,
    TextField, Button, FormControlLabel, Switch, Grid, Card,
    CardContent, Checkbox, Stack, CircularProgress, Alert
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import api from '../services/api';

const ApplyLoan = () => {
    const { t, i18n } = useTranslation();
    const steps = [t('apply.step_basic'), t('apply.step_financials'), t('apply.step_collateral'), t('apply.step_documents')];
    const { loanId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const prefilledData = location.state?.loanData || {};

    const [activeStep, setActiveStep] = useState(0);
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        borrowerAge: prefilledData.borrowerAge || prefilledData.age || '',
        requestedAmount: prefilledData.requestedAmount || prefilledData.amount || '',
        requestedTenure: prefilledData.requestedTenure || prefilledData.tenure || '',
        purpose: prefilledData.purpose || '',
        monthlyIncome: prefilledData.monthlyIncome || prefilledData.income || '',
        creditScore: prefilledData.creditScore || '',
        hasCollateral: false,
        collateralDetails: '',
        requirementsMet: {
            identityVerified: false,
            addressVerified: false,
            incomeVerified: false
        }
    });

    const [files, setFiles] = useState({
        identity: null,
        address: null,
        income: null
    });

    useEffect(() => {
        const fetchLoan = async () => {
            try {
                const { data } = await api.get(`/loans/${loanId}`);
                setLoan(data);
                if (!prefilledData.amount) {
                    setFormData(prev => ({
                        ...prev,
                        requestedAmount: data.loanAmount.min,
                        requestedTenure: data.tenure.min
                    }));
                }
            } catch (err) {
                setError(t('apply.fetch_error') || 'Failed to fetch loan details');
            } finally {
                setLoading(false);
            }
        };
        fetchLoan();
    }, [loanId]);

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => {
        if (activeStep === 0) {
            navigate(-1); // Go back to where the user came from (e.g., chat)
        } else {
            setActiveStep((prev) => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        try {
            // 1. Create Application
            const submissionData = {
                loanId,
                ...formData,
                purpose: formData.purpose || t('apply.purpose_default') || 'Loan Application'
            };

            const { data: application } = await api.post('/applications', submissionData);

            const applicationId = application._id;

            // 2. Upload Documents
            const uploadDocument = async (file, type) => {
                const uploadData = new FormData();
                uploadData.append('document', file);
                uploadData.append('documentType', type);
                await api.post(`/applications/${applicationId}/upload`, uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            };

            const uploadPromises = [];
            if (files.identity) uploadPromises.push(uploadDocument(files.identity, 'identity'));
            if (files.address) uploadPromises.push(uploadDocument(files.address, 'address'));
            if (files.income) uploadPromises.push(uploadDocument(files.income, 'income'));

            if (uploadPromises.length > 0) {
                await Promise.all(uploadPromises);
            }

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || t('apply.submit_error') || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file }));
            setFormData(prev => ({
                ...prev,
                requirementsMet: {
                    ...prev.requirementsMet,
                    [`${type}Verified`]: true
                }
            }));
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth label={t('apply.age')} type="number"
                                value={formData.borrowerAge}
                                onChange={(e) => setFormData({ ...formData, borrowerAge: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth label={t('apply.requested_amount')} type="number"
                                value={formData.requestedAmount}
                                onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth label={t('apply.requested_tenure')} type="number"
                                value={formData.requestedTenure}
                                onChange={(e) => setFormData({ ...formData, requestedTenure: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth label={t('apply.purpose')} multiline rows={2}
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                );
            case 1:
                return (
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth label={t('apply.monthly_income')} type="number"
                                value={formData.monthlyIncome}
                                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth label={t('apply.credit_score')} type="number"
                                value={formData.creditScore}
                                onChange={(e) => setFormData({ ...formData, creditScore: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                );
            case 2:
                return (
                    <Box>
                        <FormControlLabel
                            control={<Switch checked={formData.hasCollateral} onChange={(e) => setFormData({ ...formData, hasCollateral: e.target.checked })} />}
                            label={t('apply.has_collateral')}
                        />
                        {formData.hasCollateral && (
                            <TextField
                                fullWidth label={t('apply.collateral_details')} multiline rows={3} sx={{ mt: 2 }}
                                value={formData.collateralDetails}
                                onChange={(e) => setFormData({ ...formData, collateralDetails: e.target.value })}
                                placeholder={t('apply.collateral_placeholder')}
                            />
                        )}
                    </Box>
                );
            case 3:
                return (
                    <Stack spacing={3}>
                        <Typography variant="subtitle1" fontWeight="600">
                            {t('apply.upload_docs')}
                        </Typography>

                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>{t('apply.id_proof')}</Typography>
                            <input
                                type="file"
                                onChange={(e) => handleFileChange(e, 'identity')}
                                accept=".pdf,.jpg,.jpeg,.png"
                            />
                            {files.identity && <Typography variant="caption" display="block" color="success.main">Selected: {files.identity.name}</Typography>}
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>{t('apply.address_proof')}</Typography>
                            <input
                                type="file"
                                onChange={(e) => handleFileChange(e, 'address')}
                                accept=".pdf,.jpg,.jpeg,.png"
                            />
                            {files.address && <Typography variant="caption" display="block" color="success.main">Selected: {files.address.name}</Typography>}
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>{t('apply.income_proof')}</Typography>
                            <input
                                type="file"
                                onChange={(e) => handleFileChange(e, 'income')}
                                accept=".pdf,.jpg,.jpeg,.png"
                            />
                            {files.income && <Typography variant="caption" display="block" color="success.main">Selected: {files.income.name}</Typography>}
                        </Box>

                        <Alert severity="info" sx={{ mt: 2 }}>
                            {t('apply.file_hint')}
                        </Alert>
                    </Stack>
                );
            default:
                return null;
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 6 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #edf2f7' }}>
                <Typography variant="h4" fontWeight="800" align="center" gutterBottom color="primary">
                    {t('apply.title')}
                </Typography>
                <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
                    {loan?.name?.[i18n.language] || loan?.name?.en}
                </Typography>

                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
                    {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Box sx={{ minHeight: 250 }}>
                    {renderStepContent(activeStep)}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                        onClick={handleBack}
                        startIcon={<ArrowLeft size={18} />}
                    >
                        {t('common.back')}
                    </Button>
                    {activeStep === steps.length - 1 ? (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleSubmit}
                            disabled={submitting || !formData.requirementsMet.identityVerified || !formData.requirementsMet.incomeVerified}
                            startIcon={<Save size={18} />}
                        >
                            {submitting ? t('common.processing') : t('common.submit')}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            endIcon={<ArrowRight size={18} />}
                        >
                            {t('common.next')}
                        </Button>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default ApplyLoan;
