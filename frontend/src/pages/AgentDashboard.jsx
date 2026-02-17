import React, { useState, useEffect } from 'react';
import {
    Container, Grid, Typography, Box, Paper, Button, Stack, Card, CardContent, Chip,
    Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, IconButton, Tooltip, Divider, Modal, TextField, Alert, CircularProgress,
    Tabs, Tab, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
    Users, TrendingUp, CheckCircle, Clock, Plus, ExternalLink,
    MessageSquare, BadgeCheck, Trash2, ShieldCheck, ShieldAlert, ShieldQuestion,
    FileText, Eye, X, ThumbsUp, ThumbsDown, Search, ScanSearch
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AgentDashboard = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [submittingLoan, setSubmittingLoan] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    // Application detail modal
    const [selectedLead, setSelectedLead] = useState(null);
    const [leadDetail, setLeadDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [reviewingAction, setReviewingAction] = useState(null);

    const [newLoanData, setNewLoanData] = useState({
        loanType: 'personal',
        name: { en: '', hi: '', ta: '' },
        description: { en: '', hi: '', ta: '' },
        interestRate: { min: 8, max: 12 },
        loanAmount: { min: 10000, max: 1000000 },
        tenure: { min: 12, max: 60 },
        eligibilityCriteria: {
            minAge: 18,
            maxAge: 65,
            minIncome: 15000,
            minCreditScore: 650
        }
    });

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const [dashRes, loansRes] = await Promise.all([
                api.get('/agents/dashboard'),
                api.get('/loans')
            ]);
            setData(dashRes.data);
            setLoans(loansRes.data);
        } catch (err) {
            console.error('Failed to fetch agent dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (leadId) => {
        setShowDetailModal(true);
        setLoadingDetail(true);
        setLeadDetail(null);
        setReviewRemarks('');
        try {
            const { data } = await api.get(`/agents/leads/${leadId}`);
            setLeadDetail(data);
        } catch (err) {
            console.error('Failed to fetch lead detail');
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleAnalyzeDocuments = async () => {
        if (!leadDetail) return;
        setAnalyzing(true);
        try {
            const { data } = await api.post(`/agents/leads/${leadDetail._id}/analyze-documents`);
            setLeadDetail(prev => ({
                ...prev,
                documentAnalysis: {
                    isAnalyzed: true,
                    analysisResult: data.verdict,
                    analysisDetails: data.details,
                    analyzedAt: data.analyzedAt
                }
            }));
        } catch (err) {
            alert(err.response?.data?.message || 'Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleReview = async (action) => {
        if (!leadDetail) return;
        setReviewingAction(action);
        try {
            await api.put(`/agents/leads/${leadDetail._id}/review`, {
                action,
                remarks: reviewRemarks
            });
            alert(`Application ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
            setShowDetailModal(false);
            fetchDashboard();
        } catch (err) {
            alert(err.response?.data?.message || 'Review failed');
        } finally {
            setReviewingAction(null);
        }
    };

    const handleDeleteLead = async (leadId) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) return;
        try {
            await api.delete(`/applications/${leadId}`);
            fetchDashboard();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete lead');
        }
    };

    const handleAddLoan = async (e) => {
        e.preventDefault();
        setSubmittingLoan(true);
        try {
            await api.post('/loans', newLoanData);
            alert('Loan product added successfully!');
            setShowLoanModal(false);
            const { data: loansList } = await api.get('/loans');
            setLoans(loansList);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add loan product');
        } finally {
            setSubmittingLoan(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'submitted': 'info',
            'approved': 'success',
            'rejected': 'error',
            'under-review': 'warning',
            'disbursed': 'secondary'
        };
        return colors[status] || 'default';
    };

    const getAnalysisIcon = (result) => {
        if (result === 'genuine') return <ShieldCheck size={20} color="#4caf50" />;
        if (result === 'suspicious') return <ShieldAlert size={20} color="#f44336" />;
        return <ShieldQuestion size={20} color="#ff9800" />;
    };

    const filteredLeads = data?.leads?.filter(lead => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return ['submitted', 'under-review'].includes(lead.status);
        return lead.status === statusFilter;
    }) || [];

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 6 }}>
                <Skeleton variant="text" width={300} height={60} sx={{ mb: 4 }} />
                <Grid container spacing={3}>
                    {[1, 2, 3, 4].map(i => (
                        <Grid size={{ xs: 12, md: 3 }} key={i}>
                            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                </Grid>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight="800" color="primary.dark">
                        {user?.role === 'admin' ? 'Admin Portal' : 'Agent Portal'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {user?.role === 'admin' ? 'Review & manage all loan applications' : 'Review, analyze & manage your leads'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => setShowLoanModal(true)}
                    sx={{ borderRadius: 2 }}
                >
                    {t('agent.add_loan_btn') || 'Add Loan Product'}
                </Button>
            </Stack>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
                {[
                    { label: user?.role === 'admin' ? 'Total Applications' : 'My Total Leads', value: data?.stats?.totalLeads || 0, icon: <Users size={28} />, color: '#3949ab' },
                    { label: 'Pending Review', value: data?.stats?.pendingLeads || 0, icon: <Clock size={28} />, color: '#fb8c00' },
                    { label: 'Approved', value: data?.stats?.approvedLeads || 0, icon: <CheckCircle size={28} />, color: '#43a047' },
                    { label: 'Conversion Rate', value: `${data?.stats?.totalLeads ? Math.round((data.stats.approvedLeads / data.stats.totalLeads) * 100) : 0}%`, icon: <TrendingUp size={28} />, color: '#7b1fa2' }
                ].map((stat, i) => (
                    <Grid size={{ xs: 6, md: 3 }} key={i}>
                        <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #edf2f7', bgcolor: 'white' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{
                                        p: 1.5, borderRadius: 3, bgcolor: `${stat.color}15`, color: stat.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {stat.icon}
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight="600">{stat.label}</Typography>
                                        <Typography variant="h5" fontWeight="800" sx={{ color: '#2d3748' }}>{stat.value}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filter & Table */}
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight="700">
                    Loan Applications
                </Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Filter Status</InputLabel>
                    <Select value={statusFilter} label="Filter Status" onChange={(e) => setStatusFilter(e.target.value)}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="pending">Pending Review</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #edf2f7', overflow: 'hidden' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Borrower</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Loan Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Amount</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Documents</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>AI Analysis</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#64748b' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredLeads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No applications found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLeads.map((lead) => (
                                <TableRow key={lead._id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewDetail(lead._id)}>
                                    <TableCell>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.light' }}>
                                                {lead.user?.name ? lead.user.name[0] : '?'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="600">{lead.user?.name || 'Unknown'}</Typography>
                                                <Typography variant="caption" color="text.secondary">{lead.user?.phone || 'N/A'}</Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{lead.loan?.name?.[lang] || lead.loan?.name?.en || 'N/A'}</TableCell>
                                    <TableCell>₹{lead.requestedAmount?.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={<FileText size={14} />}
                                            label={`${lead.documents?.length || 0} files`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {lead.documentAnalysis?.isAnalyzed ? (
                                            <Chip
                                                icon={getAnalysisIcon(lead.documentAnalysis.analysisResult)}
                                                label={lead.documentAnalysis.analysisResult?.toUpperCase()}
                                                size="small"
                                                color={lead.documentAnalysis.analysisResult === 'genuine' ? 'success' : lead.documentAnalysis.analysisResult === 'suspicious' ? 'error' : 'warning'}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Not analyzed</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={lead.status.replace('-', ' ').toUpperCase()}
                                            size="small"
                                            color={getStatusColor(lead.status)}
                                        />
                                    </TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="View Details">
                                                <IconButton size="small" onClick={() => handleViewDetail(lead._id)}>
                                                    <Eye size={18} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteLead(lead._id)}>
                                                    <Trash2 size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ========== Application Detail Modal ========== */}
            <Modal
                open={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Paper sx={{ width: '100%', maxWidth: 720, p: 0, borderRadius: 4, maxHeight: '90vh', overflowY: 'auto' }}>
                    {loadingDetail ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ mt: 2 }}>Loading application details...</Typography>
                        </Box>
                    ) : leadDetail ? (
                        <Box>
                            {/* Modal Header */}
                            <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white', borderRadius: '16px 16px 0 0' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="h6" fontWeight="700">Application Review</Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                            {leadDetail.loan?.name?.[lang] || leadDetail.loan?.name?.en} • ₹{leadDetail.requestedAmount?.toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={leadDetail.status.replace('-', ' ').toUpperCase()}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}
                                    />
                                </Stack>
                            </Box>

                            <Box sx={{ p: 3 }}>
                                {/* Borrower Info */}
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5 }}>
                                    BORROWER INFORMATION
                                </Typography>
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    {[
                                        { label: 'Name', value: leadDetail.user?.name },
                                        { label: 'Email', value: leadDetail.user?.email },
                                        { label: 'Phone', value: leadDetail.user?.phone },
                                        { label: 'Age', value: leadDetail.borrowerAge },
                                        { label: 'Monthly Income', value: `₹${leadDetail.monthlyIncome?.toLocaleString() || 'N/A'}` },
                                        { label: 'Credit Score', value: leadDetail.creditScore },
                                    ].map((item, i) => (
                                        <Grid size={{ xs: 6, md: 4 }} key={i}>
                                            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                            <Typography variant="body2" fontWeight="600">{item.value || 'N/A'}</Typography>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Loan Details */}
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5 }}>
                                    LOAN DETAILS
                                </Typography>
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid size={{ xs: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Amount</Typography>
                                        <Typography variant="body2" fontWeight="600">₹{leadDetail.requestedAmount?.toLocaleString()}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Tenure</Typography>
                                        <Typography variant="body2" fontWeight="600">{leadDetail.requestedTenure} months</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Purpose</Typography>
                                        <Typography variant="body2" fontWeight="600">{leadDetail.purpose || 'N/A'}</Typography>
                                    </Grid>
                                </Grid>

                                {/* Eligibility Summary */}
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5 }}>
                                    ELIGIBILITY CHECK
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                                    {leadDetail.eligibilityDetails && Object.entries(leadDetail.eligibilityDetails).map(([key, val]) => (
                                        <Chip
                                            key={key}
                                            icon={val ? <CheckCircle size={14} /> : <X size={14} />}
                                            label={key.replace(/([A-Z])/g, ' $1').replace('Eligible', '').trim()}
                                            size="small"
                                            color={val ? 'success' : 'error'}
                                            variant="outlined"
                                        />
                                    ))}
                                </Stack>

                                <Divider sx={{ mb: 3 }} />

                                {/* Documents Section */}
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5 }}>
                                    UPLOADED DOCUMENTS ({leadDetail.documents?.length || 0})
                                </Typography>
                                {leadDetail.documents?.length > 0 ? (
                                    <Stack spacing={1} sx={{ mb: 3 }}>
                                        {leadDetail.documents.map((doc, i) => (
                                            <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <FileText size={18} color="#64748b" />
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="600">{doc.documentType?.toUpperCase() || 'Document'}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{doc.fileName}</Typography>
                                                    </Box>
                                                </Stack>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<Eye size={14} />}
                                                    onClick={() => window.open(`${BACKEND_URL}/uploads/${doc.fileName}`, '_blank')}
                                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                                >
                                                    View
                                                </Button>
                                            </Paper>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Alert severity="warning" sx={{ mb: 3 }}>No documents uploaded for this application</Alert>
                                )}

                                {/* AI Document Analysis */}
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5 }}>
                                    AI DOCUMENT ANALYSIS
                                </Typography>
                                {leadDetail.documentAnalysis?.isAnalyzed ? (
                                    <Paper variant="outlined" sx={{
                                        p: 2, borderRadius: 3, mb: 3,
                                        borderColor: leadDetail.documentAnalysis.analysisResult === 'genuine' ? '#4caf50' :
                                            leadDetail.documentAnalysis.analysisResult === 'suspicious' ? '#f44336' : '#ff9800',
                                        bgcolor: leadDetail.documentAnalysis.analysisResult === 'genuine' ? '#e8f5e9' :
                                            leadDetail.documentAnalysis.analysisResult === 'suspicious' ? '#ffebee' : '#fff3e0'
                                    }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                                            {getAnalysisIcon(leadDetail.documentAnalysis.analysisResult)}
                                            <Typography variant="subtitle1" fontWeight="700">
                                                Verdict: {leadDetail.documentAnalysis.analysisResult?.toUpperCase()}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', opacity: 0.85 }}>
                                            {leadDetail.documentAnalysis.analysisDetails}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            Analyzed: {new Date(leadDetail.documentAnalysis.analyzedAt).toLocaleString()}
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Box sx={{ mb: 3 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={analyzing ? <CircularProgress size={16} /> : <ScanSearch size={18} />}
                                            onClick={handleAnalyzeDocuments}
                                            disabled={analyzing || !leadDetail.documents?.length}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
                                        </Button>
                                        {!leadDetail.documents?.length && (
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                No documents to analyze
                                            </Typography>
                                        )}
                                    </Box>
                                )}

                                {/* Approve / Reject Actions */}
                                {['submitted', 'under-review'].includes(leadDetail.status) && (
                                    <Box>
                                        <Divider sx={{ mb: 3 }} />
                                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5 }}>
                                            AGENT DECISION
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            placeholder="Add remarks (optional for approval, recommended for rejection)..."
                                            value={reviewRemarks}
                                            onChange={(e) => setReviewRemarks(e.target.value)}
                                            sx={{ mb: 2 }}
                                        />
                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={reviewingAction === 'approve' ? <CircularProgress size={16} color="inherit" /> : <ThumbsUp size={18} />}
                                                onClick={() => handleReview('approve')}
                                                disabled={!!reviewingAction}
                                                sx={{ flex: 1, py: 1.2, borderRadius: 2, fontWeight: 700 }}
                                            >
                                                {reviewingAction === 'approve' ? 'Approving...' : 'Approve'}
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                startIcon={reviewingAction === 'reject' ? <CircularProgress size={16} color="inherit" /> : <ThumbsDown size={18} />}
                                                onClick={() => handleReview('reject')}
                                                disabled={!!reviewingAction}
                                                sx={{ flex: 1, py: 1.2, borderRadius: 2, fontWeight: 700 }}
                                            >
                                                {reviewingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}

                                {/* Already reviewed info */}
                                {['approved', 'rejected'].includes(leadDetail.status) && (
                                    <Alert
                                        severity={leadDetail.status === 'approved' ? 'success' : 'error'}
                                        sx={{ mt: 2 }}
                                    >
                                        This application was <strong>{leadDetail.status}</strong>
                                        {leadDetail.reviewedAt && ` on ${new Date(leadDetail.reviewedAt).toLocaleDateString()}`}
                                        {leadDetail.rejectionReason && `. Reason: ${leadDetail.rejectionReason}`}
                                    </Alert>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Typography color="text.secondary">Failed to load details</Typography>
                        </Box>
                    )}
                </Paper>
            </Modal>

            {/* ========== Add Loan Modal ========== */}
            <Modal
                open={showLoanModal}
                onClose={() => setShowLoanModal(false)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Paper sx={{ width: '100%', maxWidth: 600, p: 4, borderRadius: 4, maxHeight: '90vh', overflowY: 'auto' }}>
                    <Typography variant="h5" fontWeight="800" gutterBottom color="primary">
                        {t('agent.add_loan_title') || 'Add Loan Product'}
                    </Typography>

                    <form onSubmit={handleAddLoan}>
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            <TextField
                                select
                                label={t('agent.add_loan_type') || 'Loan Type'}
                                required
                                fullWidth
                                SelectProps={{ native: true }}
                                value={newLoanData.loanType}
                                onChange={(e) => setNewLoanData({ ...newLoanData, loanType: e.target.value })}
                            >
                                {['personal', 'home', 'education', 'business', 'vehicle', 'gold', 'lap', 'agricultural', 'mortgage'].map(type => (
                                    <option key={type} value={type}>{type.toUpperCase()}</option>
                                ))}
                            </TextField>

                            <TextField
                                label="Loan Name (English)"
                                required
                                fullWidth
                                value={newLoanData.name.en}
                                onChange={(e) => setNewLoanData({ ...newLoanData, name: { ...newLoanData.name, en: e.target.value, hi: e.target.value, ta: e.target.value } })}
                            />

                            <Stack direction="row" spacing={2}>
                                <TextField label="Name (Hindi)" fullWidth value={newLoanData.name.hi} onChange={(e) => setNewLoanData({ ...newLoanData, name: { ...newLoanData.name, hi: e.target.value } })} />
                                <TextField label="Name (Tamil)" fullWidth value={newLoanData.name.ta} onChange={(e) => setNewLoanData({ ...newLoanData, name: { ...newLoanData.name, ta: e.target.value } })} />
                            </Stack>

                            <TextField
                                label="Description (English)"
                                required
                                multiline
                                rows={2}
                                fullWidth
                                value={newLoanData.description.en}
                                onChange={(e) => setNewLoanData({ ...newLoanData, description: { ...newLoanData.description, en: e.target.value, hi: e.target.value, ta: e.target.value } })}
                            />

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField label="Min Interest %" type="number" required fullWidth value={newLoanData.interestRate.min} onChange={(e) => setNewLoanData({ ...newLoanData, interestRate: { ...newLoanData.interestRate, min: e.target.value } })} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField label="Max Interest %" type="number" required fullWidth value={newLoanData.interestRate.max} onChange={(e) => setNewLoanData({ ...newLoanData, interestRate: { ...newLoanData.interestRate, max: e.target.value } })} />
                                </Grid>
                            </Grid>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField label="Min Amount (₹)" type="number" required fullWidth value={newLoanData.loanAmount.min} onChange={(e) => setNewLoanData({ ...newLoanData, loanAmount: { ...newLoanData.loanAmount, min: e.target.value } })} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField label="Max Amount (₹)" type="number" required fullWidth value={newLoanData.loanAmount.max} onChange={(e) => setNewLoanData({ ...newLoanData, loanAmount: { ...newLoanData.loanAmount, max: e.target.value } })} />
                                </Grid>
                            </Grid>

                            <TextField label="Min Income Required (₹)" type="number" required fullWidth value={newLoanData.eligibilityCriteria.minIncome} onChange={(e) => setNewLoanData({ ...newLoanData, eligibilityCriteria: { ...newLoanData.eligibilityCriteria, minIncome: e.target.value } })} />

                            <Button type="submit" variant="contained" size="large" disabled={submittingLoan} sx={{ py: 1.5, mt: 2 }}>
                                {submittingLoan ? 'Processing...' : 'Add Loan Product'}
                            </Button>
                        </Stack>
                    </form>
                </Paper>
            </Modal>
        </Container>
    );
};

export default AgentDashboard;
