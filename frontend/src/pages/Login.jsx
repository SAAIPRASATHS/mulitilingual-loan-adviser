import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Stack, Alert, Divider } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const Login = ({ role: initialRole }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: initialRole || 'borrower'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const { data } = await api.post(endpoint, formData);
            login(data);

            // Redirect based on role
            if (data.role === 'agent' || data.role === 'admin') {
                navigate('/agent/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 12 }}>
            <Paper elevation={0} sx={{ p: 5, border: '1px solid #eee' }}>
                <Typography variant="h4" fontWeight="800" textAlign="center" gutterBottom color="primary">
                    {formData.role === 'agent' ? t('auth.agent_portal') : t('auth.borrower_portal')}
                </Typography>
                <Typography variant="h5" fontWeight="600" textAlign="center" gutterBottom color="text.secondary">
                    {isLogin ? t('common.login') : t('common.register')}
                </Typography>
                <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
                    {isLogin ? t('auth.welcome_back') : t('auth.create_account')}
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Stack spacing={3}>
                        {!isLogin && (
                            <>
                                <TextField
                                    label={t('auth.full_name')}
                                    required
                                    fullWidth
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <TextField
                                    label={t('auth.phone_number')}
                                    required
                                    fullWidth
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                {!initialRole && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            {t('auth.register_as')}
                                        </Typography>
                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                variant={formData.role === 'borrower' ? 'contained' : 'outlined'}
                                                onClick={() => setFormData({ ...formData, role: 'borrower' })}
                                                fullWidth
                                            >
                                                {t('auth.borrower')}
                                            </Button>
                                            <Button
                                                variant={formData.role === 'agent' ? 'contained' : 'outlined'}
                                                onClick={() => setFormData({ ...formData, role: 'agent' })}
                                                fullWidth
                                            >
                                                {t('auth.loan_agent')}
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}
                            </>
                        )}
                        <TextField
                            label={t('auth.email_address')}
                            type="email"
                            required
                            fullWidth
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <TextField
                            label={t('auth.password')}
                            type="password"
                            required
                            fullWidth
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ py: 1.5 }}
                        >
                            {loading ? t('common.processing') : (isLogin ? t('common.login') : t('common.register'))}
                        </Button>
                    </Stack>
                </form>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button onClick={() => setIsLogin(!isLogin)} color="secondary" sx={{ mb: 1, display: 'block', width: '100%' }}>
                        {isLogin ? (isLogin && formData.role === 'agent' ? t('auth.no_agent_account') : t('auth.no_account')) : t('auth.already_have_account')}
                    </Button>

                    <Divider sx={{ my: 2 }}>{t('common.or')}</Divider>

                    <Button
                        component={RouterLink}
                        to={formData.role === 'agent' ? '/borrower/login' : '/agent/login'}
                        color="primary"
                        sx={{ fontWeight: 600 }}
                    >
                        {formData.role === 'agent' ? t('auth.go_to_borrower') : t('auth.go_to_agent')}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default Login;
