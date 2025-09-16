// src/components/documents/BuyerDataForm.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { convexMutation } from '@/lib/convex';
import { api, Id } from '@dealer/convex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Save,
  User,
  Home,
  Mail,
  CreditCard,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface BuyerDataFormProps {
  packId: string;
  buyers: any[];
  onUpdate: () => void;
}

export function BuyerDataForm({ packId, buyers, onUpdate }: BuyerDataFormProps) {
  const [buyerData, setBuyerData] = useState(() => {
    if (buyers.length === 0) {
      return [{
        buyerType: 'primary',
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        dateOfBirth: '',
        ssn: '',
        dlNumber: '',
        dlState: '',
        dlExpirationDate: '',
        email: '',
        phone: '',
        address: {
          street: '',
          apt: '',
          city: '',
          state: '',
          zipCode: '',
        },
        consents: {
          eSignature: false,
          eDelivery: false,
          privacyPolicy: false,
          marketing: false,
        },
      }];
    }
    return buyers;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveBuyer = useMutation({
    mutationFn: async (index: number) => {
      const buyer = buyerData[index];
      
      // Validate
      const validationErrors = validateBuyer(buyer);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        throw new Error('Validation failed');
      }
      
      await convexMutation(api.api.documentPacks.updateBuyerData, {
        packId: packId as Id<"document_packs">,
        buyerIndex: index,
        buyerData: buyer,
      });
    },
    onSuccess: () => {
      toast.success('Buyer information saved');
      setErrors({});
      onUpdate();
    },
    onError: (error) => {
      if (error.message !== 'Validation failed') {
        toast.error(`Failed to save: ${error.message}`);
      }
    },
  });

  const validateBuyer = (buyer: any) => {
    const errors: Record<string, string> = {};
    
    if (!buyer.firstName) errors.firstName = 'First name is required';
    if (!buyer.lastName) errors.lastName = 'Last name is required';
    if (!buyer.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!buyer.dlNumber) errors.dlNumber = "Driver's license number is required";
    if (!buyer.dlState) errors.dlState = "Driver's license state is required";
    if (!buyer.dlExpirationDate) errors.dlExpirationDate = 'Expiration date is required';
    if (!buyer.email) errors.email = 'Email is required';
    if (!buyer.phone) errors.phone = 'Phone is required';
    if (!buyer.address.street) errors['address.street'] = 'Street address is required';
    if (!buyer.address.city) errors['address.city'] = 'City is required';
    if (!buyer.address.state) errors['address.state'] = 'State is required';
    if (!buyer.address.zipCode) errors['address.zipCode'] = 'ZIP code is required';
    
    // Validate age
    if (buyer.dateOfBirth) {
      const dob = new Date(buyer.dateOfBirth);
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) errors.dateOfBirth = 'Buyer must be 18 or older';
    }
    
    // Validate DL expiration
    if (buyer.dlExpirationDate) {
      const exp = new Date(buyer.dlExpirationDate);
      if (exp < new Date()) errors.dlExpirationDate = "Driver's license is expired";
    }
    
    // Validate consents
    if (!buyer.consents.eSignature) errors.eSignature = 'E-signature consent is required';
    if (!buyer.consents.eDelivery) errors.eDelivery = 'E-delivery consent is required';
    if (!buyer.consents.privacyPolicy) errors.privacyPolicy = 'Privacy policy acknowledgment is required';
    
    return errors;
  };

  const updateBuyerField = (index: number, field: string, value: any) => {
    const updated = [...buyerData];
    
    if (field.includes('.')) {
      const parts = field.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        updated[index] = {
          ...updated[index],
          [parent]: {
            ...updated[index][parent],
            [child]: value,
          },
        };
      } else if (parts.length === 3) {
        const [parent, child, grandchild] = parts;
        updated[index] = {
          ...updated[index],
          [parent]: {
            ...updated[index][parent],
            [child]: {
              ...updated[index][parent][child],
              [grandchild]: value,
            },
          },
        };
      }
    } else {
      updated[index][field] = value;
    }
    
    setBuyerData(updated);
    
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const addCoBuyer = () => {
    setBuyerData([
      ...buyerData,
      {
        buyerType: 'co_buyer',
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        dateOfBirth: '',
        ssn: '',
        dlNumber: '',
        dlState: '',
        dlExpirationDate: '',
        email: '',
        phone: '',
        address: {
          street: '',
          apt: '',
          city: '',
          state: '',
          zipCode: '',
        },
        consents: {
          eSignature: false,
          eDelivery: false,
          privacyPolicy: false,
          marketing: false,
        },
      },
    ]);
    setActiveIndex(buyerData.length);
  };

  const removeBuyer = (index: number) => {
    if (buyerData.length > 1) {
      const updated = buyerData.filter((_, i) => i !== index);
      setBuyerData(updated);
      if (activeIndex >= updated.length) {
        setActiveIndex(updated.length - 1);
      }
    }
  };

  const currentBuyer = buyerData[activeIndex];

  return (
    <div className="space-y-6">
      {/* Buyer Tabs */}
      <div className="flex gap-2 border-b">
        {buyerData.map((buyer, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              "px-4 py-2 border-b-2 transition-colors",
              activeIndex === index
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {buyer.buyerType === 'primary' ? 'Primary Buyer' : `Co-Buyer ${index}`}
          </button>
        ))}
        
        {buyerData.length < 2 && (
          <button
            onClick={addCoBuyer}
            className="px-4 py-2 text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Co-Buyer
          </button>
        )}
      </div>

      {/* Buyer Form */}
      <div className="grid gap-6">
        {/* Identity Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Identity Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={currentBuyer.firstName}
                onChange={(e) => updateBuyerField(activeIndex, 'firstName', e.target.value)}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive mt-1">{errors.firstName}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={currentBuyer.middleName}
                onChange={(e) => updateBuyerField(activeIndex, 'middleName', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={currentBuyer.lastName}
                onChange={(e) => updateBuyerField(activeIndex, 'lastName', e.target.value)}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">{errors.lastName}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                placeholder="Jr., Sr., III"
                value={currentBuyer.suffix}
                onChange={(e) => updateBuyerField(activeIndex, 'suffix', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={currentBuyer.dateOfBirth}
                onChange={(e) => updateBuyerField(activeIndex, 'dateOfBirth', e.target.value)}
                className={errors.dateOfBirth ? 'border-destructive' : ''}
              />
              {errors.dateOfBirth && (
                <p className="text-sm text-destructive mt-1">{errors.dateOfBirth}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="ssn">SSN (Optional)</Label>
              <Input
                id="ssn"
                type="password"
                placeholder="XXX-XX-XXXX"
                value={currentBuyer.ssn}
                onChange={(e) => updateBuyerField(activeIndex, 'ssn', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Driver's License */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Driver's License
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dlNumber">License Number *</Label>
              <Input
                id="dlNumber"
                value={currentBuyer.dlNumber}
                onChange={(e) => updateBuyerField(activeIndex, 'dlNumber', e.target.value)}
                className={errors.dlNumber ? 'border-destructive' : ''}
              />
              {errors.dlNumber && (
                <p className="text-sm text-destructive mt-1">{errors.dlNumber}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="dlState">State *</Label>
              <Input
                id="dlState"
                placeholder="GA"
                maxLength={2}
                value={currentBuyer.dlState}
                onChange={(e) => updateBuyerField(activeIndex, 'dlState', e.target.value.toUpperCase())}
                className={errors.dlState ? 'border-destructive' : ''}
              />
              {errors.dlState && (
                <p className="text-sm text-destructive mt-1">{errors.dlState}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="dlExpirationDate">Expiration Date *</Label>
              <Input
                id="dlExpirationDate"
                type="date"
                value={currentBuyer.dlExpirationDate}
                onChange={(e) => updateBuyerField(activeIndex, 'dlExpirationDate', e.target.value)}
                className={errors.dlExpirationDate ? 'border-destructive' : ''}
              />
              {errors.dlExpirationDate && (
                <p className="text-sm text-destructive mt-1">{errors.dlExpirationDate}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={currentBuyer.email}
                onChange={(e) => updateBuyerField(activeIndex, 'email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={currentBuyer.phone}
                onChange={(e) => updateBuyerField(activeIndex, 'phone', e.target.value)}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={currentBuyer.address.street}
                onChange={(e) => updateBuyerField(activeIndex, 'address.street', e.target.value)}
                className={errors['address.street'] ? 'border-destructive' : ''}
              />
              {errors['address.street'] && (
                <p className="text-sm text-destructive mt-1">{errors['address.street']}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="apt">Apt/Suite</Label>
              <Input
                id="apt"
                value={currentBuyer.address.apt}
                onChange={(e) => updateBuyerField(activeIndex, 'address.apt', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={currentBuyer.address.city}
                onChange={(e) => updateBuyerField(activeIndex, 'address.city', e.target.value)}
                className={errors['address.city'] ? 'border-destructive' : ''}
              />
              {errors['address.city'] && (
                <p className="text-sm text-destructive mt-1">{errors['address.city']}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                placeholder="GA"
                maxLength={2}
                value={currentBuyer.address.state}
                onChange={(e) => updateBuyerField(activeIndex, 'address.state', e.target.value.toUpperCase())}
                className={errors['address.state'] ? 'border-destructive' : ''}
              />
              {errors['address.state'] && (
                <p className="text-sm text-destructive mt-1">{errors['address.state']}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                placeholder="30301"
                value={currentBuyer.address.zipCode}
                onChange={(e) => updateBuyerField(activeIndex, 'address.zipCode', e.target.value)}
                className={errors['address.zipCode'] ? 'border-destructive' : ''}
              />
              {errors['address.zipCode'] && (
                <p className="text-sm text-destructive mt-1">{errors['address.zipCode']}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Consents */}
        <Card>
          <CardHeader>
            <CardTitle>Consents & Acknowledgments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="eSignature"
                checked={currentBuyer.consents?.eSignature || false}
                onCheckedChange={(checked) => {
                  console.log('eSignature checkbox changed:', checked);
                  updateBuyerField(activeIndex, 'consents.eSignature', checked);
                }}
              />
              <Label htmlFor="eSignature" className="cursor-pointer">
                I consent to electronic signature *
              </Label>
            </div>
            {errors.eSignature && (
              <p className="text-sm text-destructive">{errors.eSignature}</p>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="eDelivery"
                checked={currentBuyer.consents?.eDelivery || false}
                onCheckedChange={(checked) => {
                  console.log('eDelivery checkbox changed:', checked);
                  updateBuyerField(activeIndex, 'consents.eDelivery', checked);
                }}
              />
              <Label htmlFor="eDelivery" className="cursor-pointer">
                I consent to electronic delivery of documents *
              </Label>
            </div>
            {errors.eDelivery && (
              <p className="text-sm text-destructive">{errors.eDelivery}</p>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="privacyPolicy"
                checked={currentBuyer.consents?.privacyPolicy || false}
                onCheckedChange={(checked) => {
                  console.log('privacyPolicy checkbox changed:', checked);
                  updateBuyerField(activeIndex, 'consents.privacyPolicy', checked);
                }}
              />
              <Label htmlFor="privacyPolicy" className="cursor-pointer">
                I acknowledge the privacy policy *
              </Label>
            </div>
            {errors.privacyPolicy && (
              <p className="text-sm text-destructive">{errors.privacyPolicy}</p>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="marketing"
                checked={currentBuyer.consents?.marketing || false}
                onCheckedChange={(checked) => {
                  console.log('marketing checkbox changed:', checked);
                  updateBuyerField(activeIndex, 'consents.marketing', checked);
                }}
              />
              <Label htmlFor="marketing" className="cursor-pointer">
                I agree to receive marketing communications (optional)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          {buyerData.length > 1 && (
            <Button
              variant="destructive"
              onClick={() => removeBuyer(activeIndex)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Buyer
            </Button>
          )}
          
          <Button
            onClick={() => saveBuyer.mutate(activeIndex)}
            className="ml-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Buyer Information
          </Button>
        </div>
      </div>
    </div>
  );
}