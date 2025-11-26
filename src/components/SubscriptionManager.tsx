import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Crown,
  Star,
  Zap,
  Shield,
  Users,
  Calendar,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  popular?: boolean;
  stripePriceId: string;
}

interface UserSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
      };
    }>;
  };
}

const SubscriptionManager: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const [plansRes, subscriptionRes] = await Promise.all([
        fetch('/api/payments/plans'),
        fetch('/api/payments/subscriptions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.map(plan => ({
          id: plan.id,
          name: plan.product.name,
          description: plan.product.description,
          price: plan.unit_amount / 100,
          currency: plan.currency.toUpperCase(),
          interval: plan.recurring.interval,
          features: getPlanFeatures(plan.product.name),
          popular: plan.product.name.toLowerCase().includes('premium'),
          stripePriceId: plan.id
        })));
      }

      if (subscriptionRes.ok) {
        const subscriptions = await subscriptionRes.json();
        if (subscriptions.length > 0) {
          setUserSubscription(subscriptions[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const getPlanFeatures = (planName: string): string[] => {
    const baseFeatures = [
      'Access to all study materials',
      'Interactive quizzes',
      'Progress tracking',
      'Mobile app access'
    ];

    if (planName.toLowerCase().includes('premium')) {
      return [
        ...baseFeatures,
        'Priority support',
        'Advanced analytics',
        'Offline downloads',
        'Exclusive content',
        'Early access to new features'
      ];
    }

    if (planName.toLowerCase().includes('pro')) {
      return [
        ...baseFeatures,
        'Priority support',
        'Advanced analytics',
        'Offline downloads'
      ];
    }

    return baseFeatures;
  };

  const handleSubscribe = async (priceId: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/subscription-success`,
          cancelUrl: `${window.location.origin}/subscription-cancelled`
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start subscription process');
    } finally {
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/payments/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          returnUrl: window.location.href
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'past_due':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h2>
        <p className="text-gray-600">Choose the perfect plan for your learning journey</p>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="current">Current Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    {plan.name === 'Premium' && <Crown className="w-5 h-5 text-yellow-600" />}
                    {plan.name === 'Pro' && <Zap className="w-5 h-5 text-blue-600" />}
                    {plan.name === 'Basic' && <Shield className="w-5 h-5 text-green-600" />}
                    {plan.name}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    ₹{plan.price}
                    <span className="text-sm font-normal text-gray-600">/{plan.interval}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.stripePriceId)}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    Subscribe Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="current" className="space-y-6">
          {userSubscription ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(userSubscription.status)}
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={getStatusColor(userSubscription.status)}>
                      {userSubscription.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Billing</p>
                    <p className="font-medium">
                      {new Date(userSubscription.current_period_end * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleManageSubscription} disabled={processing}>
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Manage Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                <p className="text-gray-600 mb-4">
                  Subscribe to a plan to unlock premium features and content
                </p>
                <Button onClick={() => document.querySelector('[value="plans"]')?.click()}>
                  View Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionManager;