import React, { useState } from 'react';
import {
    AppBar, Toolbar, Typography, Button, Menu, MenuItem,
    Box, IconButton, Container, useScrollTrigger, Tooltip, Stack
} from '@mui/material';
import { Languages, ChevronDown, Trash2, Menu as MenuIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Header = ({ onMenuClick }) => {
    const { t } = useTranslation();
    const { language, changeLanguage } = useLanguage();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = useState(null);

    const isChatPage = location.pathname === '/chat';
    const isAgentDashboard = location.pathname === '/agent/dashboard';
    const isBorrowerDashboard = location.pathname === '/dashboard';

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'Hindi' },
        { code: 'ta', label: 'Tamil' }
    ];

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const handleLanguageChange = (code) => {
        changeLanguage(code);
        handleMenuClose();
    };

    const handleClearChat = () => {
        window.dispatchEvent(new CustomEvent('clear-chat'));
    };

    const handleAddLead = () => {
        window.dispatchEvent(new CustomEvent('add-lead'));
    };

    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0,
    });

    return (
        <AppBar
            position="sticky"
            elevation={trigger ? 4 : 0}
            sx={{
                bgcolor: trigger ? 'rgba(255, 255, 255, 0.9)' : 'white',
                backdropFilter: trigger ? 'blur(8px)' : 'none',
                color: 'primary.main',
                borderBottom: trigger ? 'none' : '1px solid #edf2f7',
                transition: 'all 0.3s ease',
                zIndex: 1100
            }}
        >
            <Container maxWidth="lg">
                <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton
                            onClick={onMenuClick}
                            sx={{ color: 'primary.main', mr: 1 }}
                        >
                            <MenuIcon size={24} />
                        </IconButton>
                        <Typography
                            variant="h5"
                            component={Link}
                            to="/"
                            sx={{
                                fontWeight: 900,
                                textDecoration: 'none',
                                color: 'primary.main',
                                letterSpacing: -0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            {(user?.role === 'agent' || user?.role === 'admin')
                                ? (user?.role === 'admin' ? 'Admin Portal' : t('nav.agent_portal'))
                                : t('nav.loan_advisor')}
                        </Typography>
                        {isChatPage && (
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                                | {t('nav.advisor_chat')}
                            </Typography>
                        )}
                        {isAgentDashboard && (
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                                | {t('nav.agent_workspace')}
                            </Typography>
                        )}
                        {isBorrowerDashboard && (
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                                | {t('nav.dashboard')}
                            </Typography>
                        )}
                    </Stack>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
                        {isChatPage && (
                            <Tooltip title={t('nav.clear_chat')}>
                                <IconButton onClick={handleClearChat} color="warning" sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.2)' } }}>
                                    <Trash2 size={20} />
                                </IconButton>
                            </Tooltip>
                        )}

                        {isAgentDashboard && (
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleAddLead}
                                sx={{ borderRadius: 2, fontWeight: 700, px: 2 }}
                            >
                                {t('nav.new_lead')}
                            </Button>
                        )}

                        <Button
                            onClick={handleMenuOpen}
                            startIcon={<Languages size={18} />}
                            endIcon={<ChevronDown size={14} />}
                            sx={{
                                color: 'text.primary',
                                fontWeight: 600,
                                borderRadius: 2,
                                '&:hover': { bgcolor: '#f1f5f9' }
                            }}
                        >
                            {languages.find(l => l.code === language)?.label || t('common.language')}
                        </Button>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            PaperProps={{
                                elevation: 8,
                                sx: { borderRadius: 3, mt: 1, minWidth: 150 }
                            }}
                        >
                            {languages.map((lang) => (
                                <MenuItem
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    selected={language === lang.code}
                                    sx={{ fontWeight: 500, py: 1 }}
                                >
                                    {lang.label}
                                </MenuItem>
                            ))}
                        </Menu>

                        {user ? (
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="body2" fontWeight="700" sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    {t('nav.hi')}, {user.name}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={logout}
                                    color="error"
                                    size="small"
                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                >
                                    {t('common.logout')}
                                </Button>
                            </Stack>
                        ) : (
                            <Button
                                component={Link}
                                to="/login"
                                variant="contained"
                                size="small"
                                sx={{ borderRadius: 2, fontWeight: 700 }}
                            >
                                {t('common.login')}
                            </Button>
                        )}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Header;
