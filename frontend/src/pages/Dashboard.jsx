import React, { useState, useEffect } from 'react';
import {
    Container, Grid, Typography, Box, Paper, Button, Stack, Card, CardContent, Chip,
    Skeleton, Modal, CircularProgress, Divider, List, ListItem, ListItemIcon, ListItemText,
    IconButton, Alert
} from '@mui/material';
import { Plus, CheckCircle, Clock, AlertCircle, FileText, X, Check, Info, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoanProductCard from '../components/LoanProductCard';

const Dashboard = () => {
    const [loans, setLoans] = useState([]);
    const [applications, setApplications] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Eligibility Modal States
    const [eligibilityData, setEligibilityData] = useState(null);
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [loansRes, appsRes] = await Promise.all([
                api.get('/loans'),
                api.get('/applications/my-applications')
            ]);
            setLoans(loansRes.data);
            setApplications(appsRes.data);
        } catch (err) {
            console.error('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyLoan = async (loanId) => {
        setSubmitting(true);
        try {
            await api.post('/applications', {
                loanId,
                requestedAmount: eligibilityData.loanAmount || 100000,
                requestedTenure: 12,
                purpose: t('apply.purpose_default') || 'Regular Loan Application'
            });
            alert(t('dashboard.application_success') || 'Application submitted successfully!');
            setShowModal(false);
            fetchData();
        } catch (err) {
            console.error('Application submission failed');
            alert(err.response?.data?.message || t('apply.submit_error') || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckEligibility = async (loanId) => {
        // Now directly navigate to the detailed application page
        navigate(`/apply/${loanId}`);
    };

    const getStatusChip = (status) => {
        const configs = {
            'submitted': { color: 'info', icon: <Clock size={16} />, label: t('dashboard.status_submitted') || 'SUBMITTED' },
            'approved': { color: 'success', icon: <CheckCircle size={16} />, label: t('dashboard.status_approved') || 'APPROVED' },
            'rejected': { color: 'error', icon: <AlertCircle size={16} />, label: t('dashboard.status_rejected') || 'REJECTED' },
            'under-review': { color: 'warning', icon: <Clock size={16} />, label: t('dashboard.status_under_review') || 'UNDER REVIEW' }
        };
        const config = configs[status] || { color: 'default', icon: null, label: status.toUpperCase() };
        return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
    };

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            {(user?.role === 'admin' || user?.role === 'agent') && (
                <Alert
                    severity="info"
                    variant="outlined"
                    sx={{ mb: 4, borderRadius: 3, bgcolor: 'rgba(25, 118, 210, 0.04)', borderColor: 'primary.light' }}
                    action={
                        <Button color="primary" size="small" component={RouterLink} to="/agent/dashboard" sx={{ fontWeight: 700 }}>
                            Go to Admin Portal
                        </Button>
                    }
                >
                    <Typography variant="body2" fontWeight="600">
                        {user.role === 'admin' ? 'You are logged in as an Administrator.' : 'You are logged in as a Loan Agent.'}
                    </Typography>
                    <Typography variant="caption">
                        You can access the review workspace to manage loan applications.
                    </Typography>
                </Alert>
            )}
            <Typography variant="h4" fontWeight="800" sx={{ mb: 4 }}>
                {t('dashboard.welcome')}
            </Typography>

            <Grid container spacing={6}>
                {/* Applications Section */}
                <Grid size={{ xs: 12 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.light', color: 'white', display: 'flex' }}>
                            <FileText size={20} />
                        </Box>
                        <Typography variant="h5" fontWeight="800">
                            {t('dashboard.active_applications')}
                        </Typography>
                    </Stack>

                    <Stack spacing={3}>
                        {loading ? (
                            [1, 2].map(i => <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 4 }} />)
                        ) : applications.length === 0 ? (
                            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, border: '2px dashed #e0e0e0', bgcolor: 'rgba(255,255,255,0.5)' }}>
                                <FileText size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
                                <Typography variant="h6" color="text.secondary">{t('dashboard.no_applications')}</Typography>
                                <Typography variant="body2" color="text.secondary">{t('dashboard.start_chat_hint')}</Typography>
                            </Paper>
                        ) : (
                            applications.map(app => (
                                <Card key={app._id} elevation={0} sx={{
                                    borderRadius: 4,
                                    border: '1px solid #edf2f7',
                                    transition: 'all 0.3s ease',
                                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 20px -5px rgba(0, 0, 0, 0.08)' }
                                }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Typography variant="h6" fontWeight="700" color="primary.dark">
                                                {app.loan?.name?.[i18n.language] || app.loan?.name?.en || 'N/A'}
                                            </Typography>
                                            {getStatusChip(app.status)}
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                            <Typography variant="body2" fontWeight="600" sx={{ px: 1.5, py: 0.5, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
                                                ₹{app.requestedAmount.toLocaleString()}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                {app.purpose}
                                            </Typography>
                                        </Box>

                                        <Divider sx={{ my: 2, opacity: 0.6 }} />

                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Clock size={12} style={{ marginRight: 6 }} />
                                            {t('dashboard.last_updated')} {new Date(app.updatedAt || Date.now()).toLocaleDateString()}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </Stack>
                </Grid>

                {/* Recommended Offers Section */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.light', color: 'white', display: 'flex' }}>
                            <TrendingUp size={20} />
                        </Box>
                        <Typography variant="h5" fontWeight="800">
                            {t('dashboard.recommended_offers')}
                        </Typography>
                    </Stack>

                    <Grid container spacing={3}>
                        {loading ? (
                            [1, 2].map(i => (
                                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4 }} />
                                </Grid>
                            ))
                        ) : (
                            loans.map(loan => (
                                <Grid key={loan._id} size={{ xs: 12, sm: 6 }}>
                                    <LoanProductCard
                                        loan={loan}
                                        onCheckEligibility={handleCheckEligibility}
                                    />
                                </Grid>
                            ))
                        )}
                    </Grid>
                </Grid>

                {/* News & Tips Section */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={4}>
                        <Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.light', color: 'white', display: 'flex' }}>
                                    <Info size={20} />
                                </Box>
                                <Typography variant="h5" fontWeight="800">
                                    {t('dashboard.financial_tips')}
                                </Typography>
                            </Stack>
                            <Stack spacing={2}>
                                {[
                                    { title: t('dashboard.tip1_title'), desc: t('dashboard.tip1_desc') },
                                    { title: t('dashboard.tip2_title'), desc: t('dashboard.tip2_desc') },
                                    { title: t('dashboard.tip3_title'), desc: t('dashboard.tip3_desc') }
                                ].map((tip, i) => (
                                    <Paper key={i} sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafd', border: '1px solid #edf2f7' }}>
                                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>{tip.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">{tip.desc}</Typography>
                                    </Paper>
                                ))}
                            </Stack>
                        </Box>

                        <Box>
                            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'primary.main', color: 'white' }}>
                                <Typography variant="h6" fontWeight={800} gutterBottom>{t('dashboard.plan_loan_title')}</Typography>
                                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                                    {t('dashboard.plan_loan_desc')}
                                </Typography>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/emi-calculator')}
                                    sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }}
                                >
                                    {t('dashboard.try_emi')}
                                </Button>
                            </Paper>
                        </Box>
                    </Stack>
                </Grid>
            </Grid>

            {/* Eligibility Modal */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Paper sx={{ width: '100%', maxWidth: 500, p: 4, borderRadius: 4, position: 'relative' }}>
                    <IconButton
                        onClick={() => setShowModal(false)}
                        sx={{ position: 'absolute', right: 16, top: 16 }}
                    >
                        <X size={20} />
                    </IconButton>

                    {checkingEligibility ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress sx={{ mb: 2 }} />
                            <Typography variant="h6">{t('dashboard.checking_eligibility')}</Typography>
                            <Typography variant="body2" color="text.secondary">{t('dashboard.verifying_profile')}</Typography>
                        </Box>
                    ) : eligibilityData?.error ? (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <AlertCircle size={48} color="#f44336" style={{ marginBottom: 16 }} />
                            <Typography variant="h5" color="error" gutterBottom>{t('dashboard.profile_incomplete')}</Typography>
                            <Typography variant="body1" sx={{ mb: 3 }}>{eligibilityData.error}</Typography>
                            <Button variant="contained" component={RouterLink} to="/chat">{t('dashboard.complete_in_chat')}</Button>
                        </Box>
                    ) : eligibilityData ? (
                        <Box>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                <Box sx={{
                                    width: 60, height: 60, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    bgcolor: eligibilityData.isEligible ? 'success.light' : 'error.light'
                                }}>
                                    {eligibilityData.isEligible ? <Check color="white" size={32} /> : <X color="white" size={32} />}
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight="800">
                                        {eligibilityData.status}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('dashboard.score')}: {eligibilityData.score}/100
                                    </Typography>
                                </Box>
                            </Stack>

                            <Typography variant="body1" fontWeight="600" sx={{ mb: 2 }}>{eligibilityData.recommendation}</Typography>

                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" sx={{ opacity: 0.6, mb: 1 }}>{t('dashboard.criteria_feedback')}</Typography>

                            <List dense>
                                {Object.entries(eligibilityData.details).map(([key, item]) => (
                                    <ListItem key={key}>
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                            {item.isEligible ? <Check size={16} color="#4caf50" /> : <AlertCircle size={16} color="#f44336" />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.message}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                        />
                                    </ListItem>
                                ))}
                            </List>

                            <Stack spacing={2} sx={{ mt: 3 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => handleApplyLoan(eligibilityData.loanId)}
                                    color="success"
                                    disabled={!eligibilityData.isEligible || submitting}
                                >
                                    {submitting ? t('common.processing') : t('loan.apply')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    component={RouterLink}
                                    to="/chat"
                                >
                                    {t('dashboard.talk_to_advisor')}
                                </Button>
                            </Stack>
                        </Box>
                    ) : null}
                </Paper>
            </Modal>
        </Container>
    );
};

export default Dashboard;
