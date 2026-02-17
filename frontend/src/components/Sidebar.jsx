import React from 'react';
import {
    Drawer, List, ListItem, ListItemIcon, ListItemText,
    IconButton, Box, Divider, Typography, ListItemButton
} from '@mui/material';
import {
    LayoutDashboard, Calculator, MessageSquare, GraduationCap,
    ArrowLeftRight, X, ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ open, onClose }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { text: t('nav.dashboard'), icon: <LayoutDashboard size={22} />, path: (user?.role === 'agent' || user?.role === 'admin') ? '/agent/dashboard' : '/dashboard' },
        { text: t('nav.emi_calculator'), icon: <Calculator size={22} />, path: '/emi-calculator' },
        { text: t('nav.chat_advisor'), icon: <MessageSquare size={22} />, path: '/chat' },
        { text: t('nav.financial_education'), icon: <GraduationCap size={22} />, path: '/education' },
        { text: t('nav.compare_loans'), icon: <ArrowLeftRight size={22} />, path: '/comparison' },
    ];

    const handleNavigation = (path) => {
        navigate(path);
        onClose();
    };

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 280,
                    bgcolor: 'white',
                    borderRight: 'none',
                    boxShadow: '4px 0 10px rgba(0,0,0,0.05)'
                }
            }}
        >
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    {t('nav.loan_advisor')}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <X size={20} />
                </IconButton>
            </Box>

            <Divider sx={{ mx: 2, mb: 2 }} />

            <List sx={{ px: 2 }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                onClick={() => handleNavigation(item.path)}
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: isActive ? 'primary.main' : 'transparent',
                                    color: isActive ? 'white' : 'text.primary',
                                    '&:hover': {
                                        bgcolor: isActive ? 'primary.dark' : 'rgba(26, 35, 126, 0.05)',
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: '0.95rem'
                                    }}
                                />
                                {isActive && <ChevronRight size={16} />}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            <Box sx={{ mt: 'auto', p: 3 }}>
                <Box sx={{
                    p: 2,
                    bgcolor: 'rgba(26, 35, 126, 0.05)',
                    borderRadius: 4,
                    textAlign: 'center'
                }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        {t('nav.need_help')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t('nav.agent_availability')}
                    </Typography>
                </Box>
            </Box>
        </Drawer>
    );
};

export default Sidebar;
